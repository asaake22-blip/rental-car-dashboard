/**
 * 取引先管理（Account）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import "@/lib/events/handlers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import {
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/validations/account";
import {
  ValidationError,
  NotFoundError,
  PermissionError,
} from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import type { Account, Prisma } from "@/generated/prisma/client";

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
  if (target?.includes("accountCode")) {
    return new ValidationError("取引先コードが重複しています");
  }
  if (target?.includes("mfPartnerId")) {
    return new ValidationError("MFクラウド取引先IDが重複しています");
  }
  if (target?.includes("legacyCompanyCode")) {
    return new ValidationError("旧法人コードが重複しています");
  }
  return new ValidationError("一意制約違反です");
}

/** AC-NNNNN 形式の自動採番 */
async function nextAccountCode(): Promise<string> {
  const last = await prisma.account.findFirst({
    orderBy: { accountCode: "desc" },
    select: { accountCode: true },
  });
  const nextNum = last
    ? parseInt(last.accountCode.replace("AC-", ""), 10) + 1
    : 1;
  return `AC-${String(nextNum).padStart(5, "0")}`;
}

/**
 * 支払期日を計算する
 *
 * ロジック:
 * 1. issueDate の日が closingDay 以下なら、issueDate の月が締月
 * 2. issueDate の日が closingDay より大なら、issueDate の翌月が締月
 * 3. 締月 + paymentMonthOffset ヶ月後 = 支払月
 * 4. paymentDay が null なら月末日、指定があればその日
 * 5. 月末日を超える paymentDay の場合はその月の末日を使用
 */
function calcDueDate(
  issueDate: Date,
  closingDay: number | null,
  paymentMonthOffset: number | null,
  paymentDay: number | null,
): Date {
  // 締日・支払条件が未設定の場合はデフォルト（issueDate + 30日）
  if (closingDay == null) {
    const defaultDue = new Date(issueDate);
    defaultDue.setDate(defaultDue.getDate() + 30);
    return defaultDue;
  }

  const year = issueDate.getFullYear();
  const month = issueDate.getMonth(); // 0-indexed
  const day = issueDate.getDate();

  // 1-2. 締月の決定
  let closingYear = year;
  let closingMonth = month; // 0-indexed
  if (day > closingDay) {
    // 翌月が締月
    closingMonth += 1;
    if (closingMonth > 11) {
      closingMonth = 0;
      closingYear += 1;
    }
  }

  // 3. 支払月 = 締月 + paymentMonthOffset
  const offset = paymentMonthOffset ?? 0;
  let payYear = closingYear;
  let payMonth = closingMonth + offset; // 0-indexed
  payYear += Math.floor(payMonth / 12);
  payMonth = payMonth % 12;

  // 4-5. 支払日の決定
  // 月末日を取得（翌月の0日目 = 当月末日）
  const lastDayOfMonth = new Date(payYear, payMonth + 1, 0).getDate();

  let finalDay: number;
  if (paymentDay == null) {
    // 月末払い
    finalDay = lastDayOfMonth;
  } else {
    // 指定日（月末日を超える場合は月末日に丸める）
    finalDay = Math.min(paymentDay, lastDayOfMonth);
  }

  return new Date(payYear, payMonth, finalDay);
}

// ---------------------------------------------------------------------------
// サービス
// ---------------------------------------------------------------------------

export const accountService = {
  /**
   * 取引先一覧取得（ページネーション + フィルタ）
   */
  async list(params: {
    where?: Prisma.AccountWhereInput;
    orderBy?:
      | Prisma.AccountOrderByWithRelationInput
      | Prisma.AccountOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  } = {}): Promise<{ data: Account[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.account.findMany({
        where: params.where,
        orderBy: params.orderBy ?? { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      prisma.account.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /**
   * 取引先詳細取得
   */
  async get(id: string): Promise<Account | null> {
    return prisma.account.findUnique({
      where: { id },
      include: {
        quotations: true,
        invoices: true,
        reservations: true,
      },
    });
  },

  /**
   * 取引先作成（AC-NNNNN 自動採番）
   */
  async create(input: unknown): Promise<Account> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createAccountSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    try {
      const accountCode = await nextAccountCode();

      const account = await prisma.account.create({
        data: {
          accountCode,
          accountName: parsed.data.accountName,
          accountNameKana: parsed.data.accountNameKana ?? null,
          accountType: parsed.data.accountType,
          closingDay: parsed.data.closingDay ?? null,
          paymentMonthOffset: parsed.data.paymentMonthOffset ?? null,
          paymentDay: parsed.data.paymentDay ?? null,
          paymentTermsLabel: parsed.data.paymentTermsLabel ?? null,
          mfPartnerId: parsed.data.mfPartnerId ?? null,
          mfPartnerCode: parsed.data.mfPartnerCode ?? null,
          zipCode: parsed.data.zipCode ?? null,
          address: parsed.data.address ?? null,
          phone: parsed.data.phone ?? null,
          email: parsed.data.email || null,
          legacyCompanyCode: parsed.data.legacyCompanyCode ?? null,
        },
      });

      await eventBus.emit("account.created", {
        account,
        userId: user.id,
      });

      return account;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /**
   * 取引先更新
   */
  async update(id: string, input: unknown): Promise<Account> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = updateAccountSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    // 存在確認
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("取引先が見つかりません");
    }

    try {
      const account = await prisma.account.update({
        where: { id },
        data: {
          ...(parsed.data.accountName !== undefined && { accountName: parsed.data.accountName }),
          ...(parsed.data.accountNameKana !== undefined && { accountNameKana: parsed.data.accountNameKana ?? null }),
          ...(parsed.data.accountType !== undefined && { accountType: parsed.data.accountType }),
          ...(parsed.data.closingDay !== undefined && { closingDay: parsed.data.closingDay ?? null }),
          ...(parsed.data.paymentMonthOffset !== undefined && { paymentMonthOffset: parsed.data.paymentMonthOffset ?? null }),
          ...(parsed.data.paymentDay !== undefined && { paymentDay: parsed.data.paymentDay ?? null }),
          ...(parsed.data.paymentTermsLabel !== undefined && { paymentTermsLabel: parsed.data.paymentTermsLabel ?? null }),
          ...(parsed.data.mfPartnerId !== undefined && { mfPartnerId: parsed.data.mfPartnerId ?? null }),
          ...(parsed.data.mfPartnerCode !== undefined && { mfPartnerCode: parsed.data.mfPartnerCode ?? null }),
          ...(parsed.data.zipCode !== undefined && { zipCode: parsed.data.zipCode ?? null }),
          ...(parsed.data.address !== undefined && { address: parsed.data.address ?? null }),
          ...(parsed.data.phone !== undefined && { phone: parsed.data.phone ?? null }),
          ...(parsed.data.email !== undefined && { email: parsed.data.email || null }),
          ...(parsed.data.legacyCompanyCode !== undefined && { legacyCompanyCode: parsed.data.legacyCompanyCode ?? null }),
        },
      });

      await eventBus.emit("account.updated", {
        account,
        userId: user.id,
      });

      return account;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /**
   * 取引先削除（MANAGER 権限必須）
   *
   * 関連データ（見積・請求書・予約）が存在する場合は削除不可。
   */
  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError("削除にはマネージャー以上の権限が必要です");
    }

    // 存在確認 + 関連データチェック
    const existing = await prisma.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            quotations: true,
            invoices: true,
            reservations: true,
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundError("取引先が見つかりません");
    }

    const relatedCount =
      existing._count.quotations +
      existing._count.invoices +
      existing._count.reservations;
    if (relatedCount > 0) {
      const details: string[] = [];
      if (existing._count.quotations > 0) {
        details.push(`見積${existing._count.quotations}件`);
      }
      if (existing._count.invoices > 0) {
        details.push(`請求書${existing._count.invoices}件`);
      }
      if (existing._count.reservations > 0) {
        details.push(`予約${existing._count.reservations}件`);
      }
      throw new ValidationError(
        `関連データ（${details.join("・")}）が存在するため削除できません`,
      );
    }

    await prisma.account.delete({ where: { id } });

    await eventBus.emit("account.deleted", {
      id,
      userId: user.id,
    });
  },

  /**
   * 支払期日を計算する
   *
   * Account の closingDay / paymentMonthOffset / paymentDay を元に、
   * 指定された発行日から支払期日を算出する。
   * 支払条件が未設定の場合は issueDate + 30日をデフォルトとする。
   */
  async calculateDueDate(
    accountId: string,
    issueDate: Date,
  ): Promise<Date> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        closingDay: true,
        paymentMonthOffset: true,
        paymentDay: true,
      },
    });
    if (!account) {
      throw new NotFoundError("取引先が見つかりません");
    }

    return calcDueDate(
      issueDate,
      account.closingDay,
      account.paymentMonthOffset,
      account.paymentDay,
    );
  },
};
