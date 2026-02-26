/**
 * 決済端末（PaymentTerminal）のサービス層
 *
 * 端末台帳の CRUD と入金との紐付け管理。
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import {
  createTerminalSchema,
  updateTerminalSchema,
} from "@/lib/validations/payment";
import {
  ValidationError,
  NotFoundError,
  PermissionError,
} from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import "@/lib/events/handlers";
import type {
  PaymentTerminal,
  Prisma,
} from "@/generated/prisma/client";

/** Zod エラーを fieldErrors に変換 */
function toFieldErrors(
  error: { issues: { path: PropertyKey[]; message: string }[] },
): Record<string, string[]> {
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
function uniqueViolationError(
  e: { meta?: { target?: string[] } },
): ValidationError {
  const target = e.meta?.target;
  if (target?.includes("serialNumber")) {
    return new ValidationError(
      "このシリアル番号は既に登録されています",
      { serialNumber: ["このシリアル番号は既に登録されています"] },
    );
  }
  return new ValidationError(
    "端末コードが重複しています",
  );
}

/** 一覧取得用の共通 include */
const listInclude = {
  office: true,
  _count: { select: { payments: true } },
} satisfies Prisma.PaymentTerminalInclude;

export const terminalService = {
  /** 端末一覧取得（ページネーション対応） */
  async list(params: {
    where?: Prisma.PaymentTerminalWhereInput;
    orderBy?:
      | Prisma.PaymentTerminalOrderByWithRelationInput
      | Prisma.PaymentTerminalOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: PaymentTerminal[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.paymentTerminal.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: listInclude,
      }),
      prisma.paymentTerminal.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /** 端末詳細取得 */
  async get(id: string): Promise<PaymentTerminal> {
    const terminal = await prisma.paymentTerminal.findUnique({
      where: { id },
      include: listInclude,
    });
    if (!terminal) {
      throw new NotFoundError("端末が見つかりません");
    }
    return terminal;
  },

  /** 端末作成（TM-NNNNN 自動採番） */
  async create(input: unknown): Promise<PaymentTerminal> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createTerminalSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const data = parsed.data;

    try {
      // 自動採番: TM-NNNNN
      const last = await prisma.paymentTerminal.findFirst({
        orderBy: { terminalCode: "desc" },
        select: { terminalCode: true },
      });
      const nextNum = last
        ? parseInt(last.terminalCode.replace("TM-", ""), 10) + 1
        : 1;
      const terminalCode = `TM-${String(nextNum).padStart(5, "0")}`;

      const terminal = await prisma.paymentTerminal.create({
        data: {
          terminalCode,
          terminalName: data.terminalName,
          terminalType: data.terminalType,
          provider: data.provider ?? null,
          modelName: data.modelName ?? null,
          serialNumber: data.serialNumber ?? null,
          officeId: data.officeId,
          note: data.note ?? null,
        },
        include: listInclude,
      });

      await eventBus.emit("terminal.created", {
        terminal,
        userId: user.id,
      });
      return terminal;
    } catch (e: unknown) {
      if (e instanceof ValidationError || e instanceof PermissionError) {
        throw e;
      }
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /** 端末更新 */
  async update(id: string, input: unknown): Promise<PaymentTerminal> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.paymentTerminal.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundError("端末が見つかりません");
    }

    const parsed = updateTerminalSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const data = parsed.data;

    try {
      const terminal = await prisma.paymentTerminal.update({
        where: { id },
        data: {
          terminalName: data.terminalName,
          terminalType: data.terminalType,
          provider: data.provider ?? null,
          modelName: data.modelName ?? null,
          serialNumber: data.serialNumber ?? null,
          officeId: data.officeId,
          status: data.status ?? existing.status,
          note: data.note ?? null,
        },
        include: listInclude,
      });

      await eventBus.emit("terminal.updated", {
        terminal,
        userId: user.id,
      });
      return terminal;
    } catch (e: unknown) {
      if (e instanceof ValidationError || e instanceof PermissionError) {
        throw e;
      }
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /** 端末削除（入金紐付けがある場合はエラー） */
  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError(
        "削除にはマネージャー以上の権限が必要です",
      );
    }

    const existing = await prisma.paymentTerminal.findUnique({
      where: { id },
      include: { _count: { select: { payments: true } } },
    });
    if (!existing) {
      throw new NotFoundError("端末が見つかりません");
    }

    if (existing._count.payments > 0) {
      throw new ValidationError(
        "入金記録が紐付けられているため削除できません",
      );
    }

    await prisma.paymentTerminal.delete({ where: { id } });

    await eventBus.emit("terminal.deleted", {
      terminal: existing,
      userId: user.id,
    });
  },
};
