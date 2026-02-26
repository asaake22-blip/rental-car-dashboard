/**
 * 請求書管理（Invoice）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import "@/lib/events/handlers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
} from "@/lib/validations/invoice";
import {
  ValidationError,
  NotFoundError,
  PermissionError,
} from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import type { Invoice, Prisma } from "@/generated/prisma/client";

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
  if (target?.includes("invoiceNumber")) {
    return new ValidationError("請求書番号が重複しています");
  }
  return new ValidationError("一意制約違反です");
}

/** IV-NNNNN 形式の自動採番 */
async function nextInvoiceNumber(): Promise<string> {
  const last = await prisma.invoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  const nextNum = last
    ? parseInt(last.invoiceNumber.replace("IV-", ""), 10) + 1
    : 1;
  return `IV-${String(nextNum).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// サービス
// ---------------------------------------------------------------------------

export const invoiceService = {
  /**
   * 請求書一覧取得（ページネーション + フィルタ）
   */
  async list(params: {
    where?: Prisma.InvoiceWhereInput;
    orderBy?:
      | Prisma.InvoiceOrderByWithRelationInput
      | Prisma.InvoiceOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  } = {}): Promise<{ data: Invoice[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where: params.where,
        orderBy: params.orderBy ?? { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: {
          reservation: true,
          allocations: true,
          account: true,
          lines: { orderBy: { sortOrder: "asc" } },
        },
      }),
      prisma.invoice.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /**
   * 請求書詳細取得
   */
  async get(id: string): Promise<Invoice | null> {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        reservation: {
          include: {
            pickupOffice: true,
            vehicleClass: true,
          },
        },
        allocations: {
          include: {
            payment: true,
          },
        },
        account: true,
        lines: { orderBy: { sortOrder: "asc" } },
      },
    });
  },

  /**
   * 請求書作成（IV-NNNNN 自動採番）
   *
   * Reservation の存在確認必須。
   * 作成時に reservation.revenueDate = invoice.dueDate を設定（トランザクション使用）。
   */
  async create(input: unknown): Promise<Invoice> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    // 予約の存在確認
    const reservation = await prisma.reservation.findUnique({
      where: { id: parsed.data.reservationId },
    });
    if (!reservation) {
      throw new NotFoundError("指定された予約が見つかりません");
    }

    try {
      const invoiceNumber = await nextInvoiceNumber();

      const invoice = await prisma.$transaction(async (tx) => {
        // 請求書を作成
        const created = await tx.invoice.create({
          data: {
            invoiceNumber,
            reservationId: parsed.data.reservationId,
            customerName: parsed.data.customerName,
            customerCode: parsed.data.customerCode ?? null,
            companyCode: parsed.data.companyCode ?? null,
            accountId: parsed.data.accountId ?? null,
            issueDate: parsed.data.issueDate,
            dueDate: parsed.data.dueDate,
            amount: parsed.data.amount,
            taxAmount: parsed.data.taxAmount,
            totalAmount: parsed.data.totalAmount,
            note: parsed.data.note ?? null,
            ...(parsed.data.lines && parsed.data.lines.length > 0
              ? {
                  lines: {
                    create: parsed.data.lines.map((line, i) => {
                      const amount = Math.floor(line.quantity * line.unitPrice);
                      const taxAmount = Math.floor(amount * line.taxRate);
                      return {
                        sortOrder: i,
                        description: line.description,
                        quantity: line.quantity,
                        unitPrice: line.unitPrice,
                        amount,
                        taxRate: line.taxRate,
                        taxAmount,
                      };
                    }),
                  },
                }
              : {}),
          },
          include: {
            reservation: true,
            allocations: true,
            account: true,
            lines: { orderBy: { sortOrder: "asc" } },
          },
        });

        // 予約の売上計上日を請求書の支払期日に設定（法人向け）
        await tx.reservation.update({
          where: { id: parsed.data.reservationId },
          data: { revenueDate: parsed.data.dueDate },
        });

        return created;
      });

      await eventBus.emit("invoice.created", {
        invoice,
        userId: user.id,
      });

      return invoice;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /**
   * 請求書更新（DRAFT ステータスのみ編集可）
   */
  async update(id: string, input: unknown): Promise<Invoice> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = updateInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    // 存在確認 + ステータスチェック
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("請求書が見つかりません");
    }

    if (existing.status !== "DRAFT") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の請求書は編集できません。下書きの請求書のみ編集可能です`,
      );
    }

    try {
      const hasLines = parsed.data.lines && parsed.data.lines.length > 0;

      const invoice = await prisma.$transaction(async (tx) => {
        // lines が渡された場合: 既存明細を全削除 → 再作成 → 金額再計算
        let lineAmounts: { amount: number; taxAmount: number } | undefined;
        if (hasLines) {
          // 既存の明細行を全削除
          await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });

          // 新しい明細行を作成
          const linesToCreate = parsed.data.lines!.map((line, i) => {
            const amount = Math.floor(line.quantity * line.unitPrice);
            const taxAmount = Math.floor(amount * line.taxRate);
            return {
              invoiceId: id,
              sortOrder: i,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              amount,
              taxRate: line.taxRate,
              taxAmount,
            };
          });

          await tx.invoiceLine.createMany({ data: linesToCreate });

          // 明細合計からヘッダー金額を再計算
          const totalLineAmount = linesToCreate.reduce((sum, l) => sum + l.amount, 0);
          const totalLineTax = linesToCreate.reduce((sum, l) => sum + l.taxAmount, 0);
          lineAmounts = { amount: totalLineAmount, taxAmount: totalLineTax };
        }

        // ヘッダー更新（lines がある場合は手入力の金額を無視し、明細合計で上書き）
        const updated = await tx.invoice.update({
          where: { id },
          data: {
            ...(parsed.data.customerName !== undefined && { customerName: parsed.data.customerName }),
            ...(parsed.data.customerCode !== undefined && { customerCode: parsed.data.customerCode ?? null }),
            ...(parsed.data.companyCode !== undefined && { companyCode: parsed.data.companyCode ?? null }),
            ...(parsed.data.issueDate !== undefined && { issueDate: parsed.data.issueDate }),
            ...(parsed.data.dueDate !== undefined && { dueDate: parsed.data.dueDate }),
            ...(!hasLines && parsed.data.amount !== undefined && { amount: parsed.data.amount }),
            ...(!hasLines && parsed.data.taxAmount !== undefined && { taxAmount: parsed.data.taxAmount }),
            ...(!hasLines && parsed.data.totalAmount !== undefined && { totalAmount: parsed.data.totalAmount }),
            ...(lineAmounts && {
              amount: lineAmounts.amount,
              taxAmount: lineAmounts.taxAmount,
              totalAmount: lineAmounts.amount + lineAmounts.taxAmount,
            }),
            ...(parsed.data.note !== undefined && { note: parsed.data.note ?? null }),
            ...(parsed.data.accountId !== undefined && { accountId: parsed.data.accountId ?? null }),
          },
          include: {
            reservation: true,
            allocations: true,
            account: true,
            lines: { orderBy: { sortOrder: "asc" } },
          },
        });

        return updated;
      });

      await eventBus.emit("invoice.updated", {
        invoice,
        userId: user.id,
      });

      return invoice;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /**
   * 請求書発行（DRAFT → ISSUED）
   */
  async issue(id: string): Promise<Invoice> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("請求書が見つかりません");
    }

    if (existing.status !== "DRAFT") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の請求書は発行できません。下書きの請求書のみ発行可能です`,
      );
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: "ISSUED" },
      include: {
        reservation: true,
        allocations: true,
      },
    });

    await eventBus.emit("invoice.issued", {
      invoice,
      userId: user.id,
    });

    return invoice;
  },

  /**
   * 入金確認（ISSUED/OVERDUE → PAID）
   */
  async markPaid(id: string, paidAt?: Date): Promise<Invoice> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("請求書が見つかりません");
    }

    if (!["ISSUED", "OVERDUE"].includes(existing.status)) {
      throw new ValidationError(
        `ステータスが「${existing.status}」の請求書は入金確認できません。発行済みまたは期日超過の請求書のみ入金確認可能です`,
      );
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: paidAt ?? new Date(),
      },
      include: {
        reservation: true,
        allocations: true,
      },
    });

    await eventBus.emit("invoice.paid", {
      invoice,
      userId: user.id,
    });

    return invoice;
  },

  /**
   * 請求書取消（DRAFT/ISSUED → CANCELLED）
   */
  async cancel(id: string): Promise<Invoice> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("請求書が見つかりません");
    }

    if (!["DRAFT", "ISSUED"].includes(existing.status)) {
      throw new ValidationError(
        `ステータスが「${existing.status}」の請求書は取消できません。下書きまたは発行済みの請求書のみ取消可能です`,
      );
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        reservation: true,
        allocations: true,
      },
    });

    await eventBus.emit("invoice.cancelled", {
      invoice,
      userId: user.id,
    });

    return invoice;
  },

  /**
   * 明細行追加（DRAFT のみ）
   */
  async addLine(
    invoiceId: string,
    line: { description: string; quantity: number; unitPrice: number; taxRate?: number },
  ): Promise<Invoice> {
    const existing = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true },
    });
    if (!existing) throw new NotFoundError("請求書が見つかりません");
    if (existing.status !== "DRAFT") {
      throw new ValidationError("下書きの請求書のみ明細行を追加できます");
    }

    const taxRate = line.taxRate ?? 0.10;
    const amount = Math.floor(line.quantity * line.unitPrice);
    const taxAmount = Math.floor(amount * taxRate);
    const sortOrder = existing.lines.length;

    await prisma.invoiceLine.create({
      data: {
        invoiceId,
        sortOrder,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount,
        taxRate,
        taxAmount,
      },
    });

    return this.recalcTotals(invoiceId);
  },

  /**
   * 明細行更新（DRAFT のみ）
   */
  async updateLine(
    lineId: string,
    line: { description?: string; quantity?: number; unitPrice?: number; taxRate?: number },
  ): Promise<Invoice> {
    const existing = await prisma.invoiceLine.findUnique({
      where: { id: lineId },
      include: { invoice: true },
    });
    if (!existing) throw new NotFoundError("明細行が見つかりません");
    if (existing.invoice.status !== "DRAFT") {
      throw new ValidationError("下書きの請求書のみ明細行を編集できます");
    }

    const quantity = line.quantity ?? existing.quantity;
    const unitPrice = line.unitPrice ?? existing.unitPrice;
    const taxRate = line.taxRate ?? existing.taxRate;
    const amount = Math.floor(quantity * unitPrice);
    const taxAmount = Math.floor(amount * taxRate);

    await prisma.invoiceLine.update({
      where: { id: lineId },
      data: {
        ...(line.description !== undefined && { description: line.description }),
        quantity,
        unitPrice,
        amount,
        taxRate,
        taxAmount,
      },
    });

    return this.recalcTotals(existing.invoiceId);
  },

  /**
   * 明細行削除（DRAFT のみ）
   */
  async removeLine(lineId: string): Promise<Invoice> {
    const existing = await prisma.invoiceLine.findUnique({
      where: { id: lineId },
      include: { invoice: true },
    });
    if (!existing) throw new NotFoundError("明細行が見つかりません");
    if (existing.invoice.status !== "DRAFT") {
      throw new ValidationError("下書きの請求書のみ明細行を削除できます");
    }

    await prisma.invoiceLine.delete({ where: { id: lineId } });
    return this.recalcTotals(existing.invoiceId);
  },

  /**
   * 明細行合計をヘッダーに反映
   */
  async recalcTotals(invoiceId: string): Promise<Invoice> {
    const lines = await prisma.invoiceLine.findMany({
      where: { invoiceId },
    });

    const amount = lines.reduce((sum, l) => sum + l.amount, 0);
    const taxAmount = lines.reduce((sum, l) => sum + l.taxAmount, 0);
    const totalAmount = amount + taxAmount;

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { amount, taxAmount, totalAmount },
      include: {
        reservation: true,
        allocations: true,
        account: true,
        lines: { orderBy: { sortOrder: "asc" } },
      },
    });
  },

  /**
   * 期日超過チェック（ISSUED → OVERDUE 一括更新）
   */
  async checkOverdue(): Promise<Invoice[]> {
    const user = await getCurrentUser();
    const now = new Date();

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "ISSUED",
        dueDate: { lt: now },
      },
    });

    const updated: Invoice[] = [];
    for (const inv of overdueInvoices) {
      const invoice = await prisma.invoice.update({
        where: { id: inv.id },
        data: { status: "OVERDUE" },
        include: {
          reservation: true,
          allocations: true,
          account: true,
          lines: { orderBy: { sortOrder: "asc" } },
        },
      });
      updated.push(invoice);

      await eventBus.emit("invoice.overdue", {
        invoice,
        userId: user.id,
      });
    }

    return updated;
  },

  /**
   * マネーフォワードに請求書を作成
   *
   * TODO: MFアダプター実装後に有効化
   */
  async createInMoneyForward(_id: string): Promise<void> {
    // TODO: MFアダプター実装後に有効化
    // 1. invoice を取得
    // 2. MFアダプター経由で請求書を作成
    // 3. externalId, externalUrl, syncedAt を更新
    throw new ValidationError(
      "マネーフォワード連携は現在未実装です",
    );
  },

  /**
   * マネーフォワードから請求書のステータスを同期
   *
   * TODO: MFアダプター実装後に有効化
   */
  async syncFromMoneyForward(_id: string): Promise<void> {
    // TODO: MFアダプター実装後に有効化
    // 1. invoice.externalId を使って MF API からステータスを取得
    // 2. externalStatus, syncedAt を更新
    // 3. 必要に応じて status を PAID に変更
    throw new ValidationError(
      "マネーフォワード連携は現在未実装です",
    );
  },
};
