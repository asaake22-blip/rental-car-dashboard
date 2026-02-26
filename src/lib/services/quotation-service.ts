/**
 * 見積書管理（Quotation）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import "@/lib/events/handlers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import {
  createQuotationSchema,
  updateQuotationSchema,
} from "@/lib/validations/quotation";
import {
  ValidationError,
  NotFoundError,
  PermissionError,
} from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import type { Quotation, Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/** Zod エラーを fieldErrors に変換 */
function toFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }
  return fieldErrors;
}

/** Prisma P2002 (unique constraint violation) の判定 */
function isPrismaUniqueError(
  e: unknown,
): e is { code: string; meta?: { target?: string[] } } {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

/** unique 違反時のエラーメッセージ生成 */
function uniqueViolationError(e: {
  meta?: { target?: string[] };
}): ValidationError {
  const target = e.meta?.target;
  if (target?.includes("quotationCode")) {
    return new ValidationError("見積書コードが重複しています");
  }
  return new ValidationError("一意制約違反です");
}

/** QT-NNNNN 形式の自動採番 */
async function nextQuotationCode(): Promise<string> {
  const last = await prisma.quotation.findFirst({
    orderBy: { quotationCode: "desc" },
    select: { quotationCode: true },
  });
  const nextNum = last
    ? parseInt(last.quotationCode.replace("QT-", ""), 10) + 1
    : 1;
  return `QT-${String(nextNum).padStart(5, "0")}`;
}

/** RS-NNNNN 形式の自動採番（予約変換用） */
async function nextReservationCode(): Promise<string> {
  const last = await prisma.reservation.findFirst({
    orderBy: { reservationCode: "desc" },
    select: { reservationCode: true },
  });
  const nextNum = last
    ? parseInt(last.reservationCode.replace("RS-", ""), 10) + 1
    : 1;
  return `RS-${String(nextNum).padStart(5, "0")}`;
}

/** 明細行から金額を計算 */
function calcLineTotals(lines: { quantity: number; unitPrice: number; taxRate: number }[]): {
  lineData: { amount: number; taxAmount: number }[];
  amount: number;
  taxAmount: number;
  totalAmount: number;
} {
  let amount = 0;
  let taxAmount = 0;
  const lineData = lines.map((line) => {
    const lineAmount = Math.floor(line.quantity * line.unitPrice);
    const lineTax = Math.floor(lineAmount * line.taxRate);
    amount += lineAmount;
    taxAmount += lineTax;
    return { amount: lineAmount, taxAmount: lineTax };
  });
  return { lineData, amount, taxAmount, totalAmount: amount + taxAmount };
}

// ---------------------------------------------------------------------------
// サービス
// ---------------------------------------------------------------------------

export const quotationService = {
  /**
   * 見積書一覧取得（ページネーション + フィルタ）
   */
  async list(params: {
    where?: Prisma.QuotationWhereInput;
    orderBy?:
      | Prisma.QuotationOrderByWithRelationInput
      | Prisma.QuotationOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  } = {}): Promise<{ data: Quotation[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.quotation.findMany({
        where: params.where,
        orderBy: params.orderBy ?? { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: {
          account: true,
          lines: true,
          vehicleClass: true,
        },
      }),
      prisma.quotation.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /**
   * 見積書詳細取得
   */
  async get(id: string): Promise<Quotation | null> {
    return prisma.quotation.findUnique({
      where: { id },
      include: {
        account: true,
        lines: { orderBy: { sortOrder: "asc" } },
        vehicleClass: true,
        pickupOffice: true,
        returnOffice: true,
        reservation: true,
      },
    });
  },

  /**
   * 見積書作成（QT-NNNNN 自動採番）
   *
   * Account の存在確認必須。
   * 明細行から金額を自動計算。
   */
  async create(input: unknown): Promise<Quotation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createQuotationSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    // 取引先の存在確認
    const account = await prisma.account.findUnique({
      where: { id: parsed.data.accountId },
    });
    if (!account) {
      throw new NotFoundError("指定された取引先が見つかりません");
    }

    try {
      const quotationCode = await nextQuotationCode();
      const { lineData, amount, taxAmount, totalAmount } = calcLineTotals(
        parsed.data.lines,
      );

      const quotation = await prisma.$transaction(async (tx) => {
        const created = await tx.quotation.create({
          data: {
            quotationCode,
            accountId: parsed.data.accountId,
            title: parsed.data.title ?? null,
            customerName: parsed.data.customerName,
            vehicleClassId: parsed.data.vehicleClassId ?? null,
            pickupDate: parsed.data.pickupDate ?? null,
            returnDate: parsed.data.returnDate ?? null,
            pickupOfficeId: parsed.data.pickupOfficeId ?? null,
            returnOfficeId: parsed.data.returnOfficeId ?? null,
            validUntil: parsed.data.validUntil ?? null,
            note: parsed.data.note ?? null,
            amount,
            taxAmount,
            totalAmount,
            lines: {
              create: parsed.data.lines.map((line, idx) => ({
                sortOrder: idx,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                amount: lineData[idx].amount,
                taxRate: line.taxRate,
                taxAmount: lineData[idx].taxAmount,
              })),
            },
          },
          include: {
            account: true,
            lines: { orderBy: { sortOrder: "asc" } },
            vehicleClass: true,
          },
        });

        return created;
      });

      await eventBus.emit("quotation.created", {
        quotation,
        userId: user.id,
      });

      return quotation;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /**
   * 見積書更新（DRAFT / SENT ステータスのみ編集可）
   *
   * lines が指定された場合は既存行を全削除 → 新規行を作成。
   */
  async update(id: string, input: unknown): Promise<Quotation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = updateQuotationSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    // 存在確認 + ステータスチェック
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("見積書が見つかりません");
    }

    if (!["DRAFT", "SENT"].includes(existing.status)) {
      throw new ValidationError(
        `ステータスが「${existing.status}」の見積書は編集できません。下書きまたは送付済みの見積書のみ編集可能です`,
      );
    }

    try {
      const quotation = await prisma.$transaction(async (tx) => {
        // lines が指定された場合: 既存行全削除 → 新規作成 + 金額再計算
        if (parsed.data.lines) {
          const { lineData, amount, taxAmount, totalAmount } = calcLineTotals(
            parsed.data.lines,
          );

          await tx.quotationLine.deleteMany({
            where: { quotationId: id },
          });

          return tx.quotation.update({
            where: { id },
            data: {
              ...(parsed.data.title !== undefined && { title: parsed.data.title ?? null }),
              ...(parsed.data.customerName !== undefined && { customerName: parsed.data.customerName }),
              ...(parsed.data.vehicleClassId !== undefined && { vehicleClassId: parsed.data.vehicleClassId ?? null }),
              ...(parsed.data.pickupDate !== undefined && { pickupDate: parsed.data.pickupDate ?? null }),
              ...(parsed.data.returnDate !== undefined && { returnDate: parsed.data.returnDate ?? null }),
              ...(parsed.data.pickupOfficeId !== undefined && { pickupOfficeId: parsed.data.pickupOfficeId ?? null }),
              ...(parsed.data.returnOfficeId !== undefined && { returnOfficeId: parsed.data.returnOfficeId ?? null }),
              ...(parsed.data.validUntil !== undefined && { validUntil: parsed.data.validUntil ?? null }),
              ...(parsed.data.note !== undefined && { note: parsed.data.note ?? null }),
              amount,
              taxAmount,
              totalAmount,
              lines: {
                create: parsed.data.lines.map((line, idx) => ({
                  sortOrder: idx,
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  amount: lineData[idx].amount,
                  taxRate: line.taxRate,
                  taxAmount: lineData[idx].taxAmount,
                })),
              },
            },
            include: {
              account: true,
              lines: { orderBy: { sortOrder: "asc" } },
              vehicleClass: true,
            },
          });
        }

        // lines なし: ヘッダーのみ更新
        return tx.quotation.update({
          where: { id },
          data: {
            ...(parsed.data.title !== undefined && { title: parsed.data.title ?? null }),
            ...(parsed.data.customerName !== undefined && { customerName: parsed.data.customerName }),
            ...(parsed.data.vehicleClassId !== undefined && { vehicleClassId: parsed.data.vehicleClassId ?? null }),
            ...(parsed.data.pickupDate !== undefined && { pickupDate: parsed.data.pickupDate ?? null }),
            ...(parsed.data.returnDate !== undefined && { returnDate: parsed.data.returnDate ?? null }),
            ...(parsed.data.pickupOfficeId !== undefined && { pickupOfficeId: parsed.data.pickupOfficeId ?? null }),
            ...(parsed.data.returnOfficeId !== undefined && { returnOfficeId: parsed.data.returnOfficeId ?? null }),
            ...(parsed.data.validUntil !== undefined && { validUntil: parsed.data.validUntil ?? null }),
            ...(parsed.data.note !== undefined && { note: parsed.data.note ?? null }),
          },
          include: {
            account: true,
            lines: { orderBy: { sortOrder: "asc" } },
            vehicleClass: true,
          },
        });
      });

      await eventBus.emit("quotation.updated", {
        quotation,
        userId: user.id,
      });

      return quotation;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /**
   * 見積書削除（DRAFT のみ削除可、予約紐づけ済みは不可）
   *
   * QuotationLine は onDelete: Cascade で自動削除。
   */
  async delete(id: string): Promise<Quotation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("見積書が見つかりません");
    }

    if (existing.status !== "DRAFT") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の見積書は削除できません。下書きの見積書のみ削除可能です`,
      );
    }

    if (existing.reservationId) {
      throw new ValidationError(
        "予約に紐づいている見積書は削除できません",
      );
    }

    const deleted = await prisma.quotation.delete({
      where: { id },
      include: {
        account: true,
        lines: true,
        vehicleClass: true,
      },
    });

    return deleted;
  },

  /**
   * 見積書送付（DRAFT -> SENT）
   */
  async send(id: string): Promise<Quotation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("見積書が見つかりません");
    }

    if (existing.status !== "DRAFT") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の見積書は送付できません。下書きの見積書のみ送付可能です`,
      );
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status: "SENT" },
      include: {
        account: true,
        lines: { orderBy: { sortOrder: "asc" } },
        vehicleClass: true,
      },
    });

    await eventBus.emit("quotation.sent", {
      quotation,
      userId: user.id,
    });

    return quotation;
  },

  /**
   * 見積書承諾（SENT -> ACCEPTED）
   */
  async accept(id: string): Promise<Quotation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("見積書が見つかりません");
    }

    if (existing.status !== "SENT") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の見積書は承諾できません。送付済みの見積書のみ承諾可能です`,
      );
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status: "ACCEPTED" },
      include: {
        account: true,
        lines: { orderBy: { sortOrder: "asc" } },
        vehicleClass: true,
      },
    });

    await eventBus.emit("quotation.accepted", {
      quotation,
      userId: user.id,
    });

    return quotation;
  },

  /**
   * 見積書不成立（SENT -> REJECTED）
   */
  async reject(id: string): Promise<Quotation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("見積書が見つかりません");
    }

    if (existing.status !== "SENT") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の見積書は不成立にできません。送付済みの見積書のみ不成立に変更可能です`,
      );
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status: "REJECTED" },
      include: {
        account: true,
        lines: { orderBy: { sortOrder: "asc" } },
        vehicleClass: true,
      },
    });

    await eventBus.emit("quotation.rejected", {
      quotation,
      userId: user.id,
    });

    return quotation;
  },

  /**
   * 見積書期限切れ（SENT -> EXPIRED）
   */
  async expire(id: string): Promise<Quotation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("見積書が見つかりません");
    }

    if (existing.status !== "SENT") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の見積書は期限切れにできません。送付済みの見積書のみ期限切れに変更可能です`,
      );
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status: "EXPIRED" },
      include: {
        account: true,
        lines: { orderBy: { sortOrder: "asc" } },
        vehicleClass: true,
      },
    });

    return quotation;
  },

  /**
   * 見積書 → 予約変換（ACCEPTED のみ）
   *
   * Quotation の情報から Reservation を自動作成し、
   * Quotation.reservationId を更新する。
   */
  async convertToReservation(id: string): Promise<Quotation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!existing) {
      throw new NotFoundError("見積書が見つかりません");
    }

    if (existing.status !== "ACCEPTED") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の見積書は予約に変換できません。承諾済みの見積書のみ変換可能です`,
      );
    }

    if (existing.reservationId) {
      throw new ValidationError(
        "この見積書は既に予約に変換済みです",
      );
    }

    // 予約変換に必要なフィールドのバリデーション
    if (!existing.vehicleClassId) {
      throw new ValidationError(
        "車両クラスが設定されていないため予約に変換できません",
      );
    }
    if (!existing.pickupDate || !existing.returnDate) {
      throw new ValidationError(
        "出発日・帰着日が設定されていないため予約に変換できません",
      );
    }
    if (!existing.pickupOfficeId || !existing.returnOfficeId) {
      throw new ValidationError(
        "出発営業所・帰着営業所が設定されていないため予約に変換できません",
      );
    }

    try {
      const reservationCode = await nextReservationCode();

      const quotation = await prisma.$transaction(async (tx) => {
        // 予約を作成
        const reservation = await tx.reservation.create({
          data: {
            reservationCode,
            vehicleClassId: existing.vehicleClassId!,
            customerName: existing.customerName,
            customerNameKana: existing.account?.accountNameKana ?? "",
            customerPhone: existing.account?.phone ?? "",
            pickupDate: existing.pickupDate!,
            returnDate: existing.returnDate!,
            pickupOfficeId: existing.pickupOfficeId!,
            returnOfficeId: existing.returnOfficeId!,
            accountId: existing.accountId,
            estimatedAmount: existing.totalAmount,
            entityType: existing.account?.accountType === "CORPORATE" ? 2 : 1,
          },
        });

        // 見積書に予約IDを紐づけ
        const updated = await tx.quotation.update({
          where: { id },
          data: { reservationId: reservation.id },
          include: {
            account: true,
            lines: { orderBy: { sortOrder: "asc" } },
            vehicleClass: true,
            reservation: true,
          },
        });

        return updated;
      });

      await eventBus.emit("quotation.converted", {
        quotation,
        reservationId: quotation.reservationId!,
        userId: user.id,
      });

      return quotation;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /**
   * 見積書の合計金額を明細行から再計算して更新する（内部ヘルパー）
   */
  async recalcTotals(quotationId: string): Promise<Quotation> {
    const lines = await prisma.quotationLine.findMany({
      where: { quotationId },
    });

    if (lines.length === 0) {
      throw new ValidationError("明細行が存在しません");
    }

    let amount = 0;
    let taxAmount = 0;
    for (const line of lines) {
      amount += line.amount;
      taxAmount += line.taxAmount;
    }

    return prisma.quotation.update({
      where: { id: quotationId },
      data: {
        amount,
        taxAmount,
        totalAmount: amount + taxAmount,
      },
      include: {
        account: true,
        lines: { orderBy: { sortOrder: "asc" } },
        vehicleClass: true,
      },
    });
  },
};
