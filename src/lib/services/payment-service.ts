/**
 * 入金管理（Payment / PaymentAllocation）のサービス層
 *
 * N:N 消込構造に対応。入金と予約の消込管理を一元化する。
 * - 入金作成時の allocations 同時指定
 * - 入金残額・予約残額チェック
 * - ステータス自動計算（UNALLOCATED / PARTIALLY_ALLOCATED / FULLY_ALLOCATED）
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import {
  createPaymentSchema,
  updatePaymentSchema,
  addAllocationSchema,
  bulkAllocateSchema,
} from "@/lib/validations/payment";
import {
  ValidationError,
  NotFoundError,
  PermissionError,
} from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import "@/lib/events/handlers";
import type {
  Payment,
  PaymentAllocation,
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

/** 消込取得用の共通 include */
const allocationsInclude = {
  allocations: {
    include: { reservation: true, invoice: true },
    orderBy: { createdAt: "asc" as const },
  },
  terminal: true,
} satisfies Prisma.PaymentInclude;

/**
 * ステータス再計算ヘルパー
 *
 * 消込合計に応じて Payment.status を自動更新する。
 * - 0 → UNALLOCATED
 * - 1〜(amount-1) → PARTIALLY_ALLOCATED
 * - amount → FULLY_ALLOCATED
 */
async function _recalcStatus(
  tx: Prisma.TransactionClient,
  paymentId: string,
): Promise<void> {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    select: { amount: true },
  });
  if (!payment) return;

  const agg = await tx.paymentAllocation.aggregate({
    where: { paymentId },
    _sum: { allocatedAmount: true },
  });
  const totalAllocated = agg._sum.allocatedAmount ?? 0;

  let status: "UNALLOCATED" | "PARTIALLY_ALLOCATED" | "FULLY_ALLOCATED";
  if (totalAllocated === 0) {
    status = "UNALLOCATED";
  } else if (totalAllocated < payment.amount) {
    status = "PARTIALLY_ALLOCATED";
  } else {
    status = "FULLY_ALLOCATED";
  }

  await tx.payment.update({
    where: { id: paymentId },
    data: { status },
  });
}

/**
 * 予約の残額を計算するヘルパー
 *
 * 残額 = actualAmount + (taxAmount ?? 0) - 消込済額
 */
async function _getReservationRemaining(
  tx: Prisma.TransactionClient,
  reservationId: string,
  excludeAllocationId?: string,
): Promise<{ totalAmount: number; allocated: number; remaining: number }> {
  const reservation = await tx.reservation.findUnique({
    where: { id: reservationId },
    select: { actualAmount: true, taxAmount: true },
  });
  if (!reservation) {
    throw new NotFoundError("指定された予約が見つかりません");
  }

  const totalAmount =
    (reservation.actualAmount ?? 0) + (reservation.taxAmount ?? 0);

  const allocAgg = await tx.paymentAllocation.aggregate({
    where: {
      reservationId,
      ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {}),
    },
    _sum: { allocatedAmount: true },
  });
  const allocated = allocAgg._sum.allocatedAmount ?? 0;

  return { totalAmount, allocated, remaining: totalAmount - allocated };
}

export const paymentService = {
  /** 入金一覧取得（ページネーション対応） */
  async list(params: {
    where?: Prisma.PaymentWhereInput;
    orderBy?:
      | Prisma.PaymentOrderByWithRelationInput
      | Prisma.PaymentOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: Payment[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: allocationsInclude,
      }),
      prisma.payment.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /** 入金詳細取得 */
  async get(id: string): Promise<Payment> {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: allocationsInclude,
    });
    if (!payment) {
      throw new NotFoundError("入金が見つかりません");
    }
    return payment;
  },

  /** 入金作成（自動採番 + allocations 同時指定可能） */
  async create(input: unknown): Promise<Payment> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createPaymentSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const data = parsed.data;

    try {
      const payment = await prisma.$transaction(async (tx) => {
        // 1. 自動採番: PM-NNNNN
        const last = await tx.payment.findFirst({
          orderBy: { paymentNumber: "desc" },
          select: { paymentNumber: true },
        });
        const nextNum = last
          ? parseInt(last.paymentNumber.replace("PM-", ""), 10) + 1
          : 1;
        const paymentNumber = `PM-${String(nextNum).padStart(5, "0")}`;

        // 2. 入金レコード作成
        const created = await tx.payment.create({
          data: {
            paymentNumber,
            paymentDate: new Date(data.paymentDate),
            amount: data.amount,
            paymentCategory: data.paymentCategory,
            paymentProvider: data.paymentProvider ?? null,
            payerName: data.payerName,
            terminalId: data.terminalId ?? null,
            externalId: data.externalId ?? null,
            note: data.note ?? null,
          },
        });

        // 3. allocations 同時指定時: 残額チェック + 消込作成 + ステータス計算
        if (data.allocations && data.allocations.length > 0) {
          let totalAllocating = 0;

          for (const alloc of data.allocations) {
            totalAllocating += alloc.allocatedAmount;

            // 入金残額チェック
            if (totalAllocating > data.amount) {
              throw new ValidationError(
                "消込合計が入金額を超えています",
              );
            }

            // 予約存在 & 精算済みチェック
            const reservation = await tx.reservation.findUnique({
              where: { id: alloc.reservationId },
              select: {
                id: true,
                actualAmount: true,
                taxAmount: true,
                status: true,
              },
            });
            if (!reservation) {
              throw new ValidationError("指定された予約が見つかりません");
            }
            if (!reservation.actualAmount) {
              throw new ValidationError(
                "精算済みの予約のみ消込できます",
              );
            }

            // 予約残額チェック
            const { remaining } = await _getReservationRemaining(
              tx,
              alloc.reservationId,
            );
            if (alloc.allocatedAmount > remaining) {
              throw new ValidationError(
                "消込金額が予約の残額を超えています",
              );
            }

            await tx.paymentAllocation.create({
              data: {
                paymentId: created.id,
                reservationId: alloc.reservationId,
                invoiceId: alloc.invoiceId ?? null,
                allocatedAmount: alloc.allocatedAmount,
              },
            });
          }

          // ステータス再計算
          await _recalcStatus(tx, created.id);
        }

        return tx.payment.findUnique({
          where: { id: created.id },
          include: allocationsInclude,
        });
      });

      await eventBus.emit("payment.created", {
        payment: payment as Payment,
        userId: user.id,
      });
      return payment as Payment;
    } catch (e: unknown) {
      if (
        e instanceof ValidationError ||
        e instanceof PermissionError ||
        e instanceof NotFoundError
      ) {
        throw e;
      }
      if (isPrismaUniqueError(e)) {
        const target = e.meta?.target;
        if (target?.includes("externalId")) {
          throw new ValidationError("この外部IDは既に登録されています", {
            externalId: ["この外部IDは既に登録されています"],
          });
        }
        if (target?.includes("paymentId") && target?.includes("reservationId")) {
          throw new ValidationError(
            "同一入金に同じ予約を複数消込できません",
          );
        }
        throw new ValidationError("入金番号が重複しています");
      }
      throw e;
    }
  },

  /** 入金ヘッダー更新（金額を消込合計未満に変更 → エラー） */
  async update(id: string, input: unknown): Promise<Payment> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("入金が見つかりません");
    }

    const parsed = updatePaymentSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const data = parsed.data;

    // 金額を消込合計未満に変更 → エラー
    const agg = await prisma.paymentAllocation.aggregate({
      where: { paymentId: id },
      _sum: { allocatedAmount: true },
    });
    const totalAllocated = agg._sum.allocatedAmount ?? 0;
    if (data.amount < totalAllocated) {
      throw new ValidationError(
        `金額は消込合計（${totalAllocated.toLocaleString()}円）以上にしてください`,
        { amount: ["消込合計以上の金額を入力してください"] },
      );
    }

    try {
      const payment = await prisma.$transaction(async (tx) => {
        const updated = await tx.payment.update({
          where: { id },
          data: {
            paymentDate: new Date(data.paymentDate),
            amount: data.amount,
            paymentCategory: data.paymentCategory,
            paymentProvider: data.paymentProvider ?? null,
            payerName: data.payerName,
            terminalId: data.terminalId ?? null,
            externalId: data.externalId ?? null,
            note: data.note ?? null,
          },
        });

        // 金額変更でステータスが変わる可能性があるため再計算
        await _recalcStatus(tx, id);

        return tx.payment.findUnique({
          where: { id: updated.id },
          include: allocationsInclude,
        });
      });

      await eventBus.emit("payment.updated", {
        payment: payment as Payment,
        userId: user.id,
      });
      return payment as Payment;
    } catch (e: unknown) {
      if (
        e instanceof ValidationError ||
        e instanceof PermissionError ||
        e instanceof NotFoundError
      ) {
        throw e;
      }
      if (isPrismaUniqueError(e)) {
        const target = e.meta?.target;
        if (target?.includes("externalId")) {
          throw new ValidationError("この外部IDは既に登録されています", {
            externalId: ["この外部IDは既に登録されています"],
          });
        }
        throw new ValidationError("更新時に一意制約違反が発生しました");
      }
      throw e;
    }
  },

  /** 入金削除（MANAGER 以上。cascade で allocations も削除） */
  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError(
        "削除にはマネージャー以上の権限が必要です",
      );
    }

    const existing = await prisma.payment.findUnique({
      where: { id },
      include: allocationsInclude,
    });
    if (!existing) {
      throw new NotFoundError("入金が見つかりません");
    }

    // cascade 削除（スキーマ定義で onDelete: Cascade）
    await prisma.payment.delete({ where: { id } });

    await eventBus.emit("payment.deleted", {
      payment: existing,
      userId: user.id,
    });
  },

  /** 消込追加 */
  async addAllocation(
    paymentId: string,
    input: unknown,
  ): Promise<PaymentAllocation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = addAllocationSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const data = parsed.data;

    try {
      const allocation = await prisma.$transaction(async (tx) => {
        // 1. Payment 存在チェック
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          select: { id: true, amount: true },
        });
        if (!payment) {
          throw new NotFoundError("入金が見つかりません");
        }

        // 2. 予約存在チェック + 精算額チェック
        const reservation = await tx.reservation.findUnique({
          where: { id: data.reservationId },
          select: {
            id: true,
            actualAmount: true,
            taxAmount: true,
            status: true,
          },
        });
        if (!reservation) {
          throw new NotFoundError("予約が見つかりません");
        }
        if (!reservation.actualAmount) {
          throw new ValidationError("精算済みの予約のみ消込できます");
        }

        // 3. 入金残額チェック
        const paymentAllocAgg = await tx.paymentAllocation.aggregate({
          where: { paymentId },
          _sum: { allocatedAmount: true },
        });
        const paymentAllocated = paymentAllocAgg._sum.allocatedAmount ?? 0;
        if (paymentAllocated + data.allocatedAmount > payment.amount) {
          throw new ValidationError(
            "消込金額が入金の残額を超えています",
          );
        }

        // 4. 予約残額チェック
        const { remaining } = await _getReservationRemaining(
          tx,
          data.reservationId,
        );
        if (data.allocatedAmount > remaining) {
          throw new ValidationError(
            "消込金額が予約の残額を超えています",
          );
        }

        // 5. PaymentAllocation 作成
        const created = await tx.paymentAllocation.create({
          data: {
            paymentId,
            reservationId: data.reservationId,
            invoiceId: data.invoiceId ?? null,
            allocatedAmount: data.allocatedAmount,
          },
          include: { reservation: true, payment: true },
        });

        // 6. Payment ステータス再計算
        await _recalcStatus(tx, paymentId);

        return created;
      });

      // イベント発行
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: allocationsInclude,
      });
      await eventBus.emit("payment.allocated", {
        payment: payment as Payment,
        allocation,
        userId: user.id,
      });

      return allocation;
    } catch (e: unknown) {
      if (
        e instanceof ValidationError ||
        e instanceof PermissionError ||
        e instanceof NotFoundError
      ) {
        throw e;
      }
      if (isPrismaUniqueError(e)) {
        throw new ValidationError(
          "この予約は既にこの入金に消込されています",
          { reservationId: ["この予約は既にこの入金に消込されています"] },
        );
      }
      throw e;
    }
  },

  /** 一括消込 */
  async bulkAllocate(
    paymentId: string,
    input: unknown,
  ): Promise<PaymentAllocation[]> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = bulkAllocateSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const { allocations: allocInputs } = parsed.data;

    try {
      const allocations = await prisma.$transaction(async (tx) => {
        // Payment 存在チェック
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          select: { id: true, amount: true },
        });
        if (!payment) {
          throw new NotFoundError("入金が見つかりません");
        }

        // 既存消込合計
        const paymentAllocAgg = await tx.paymentAllocation.aggregate({
          where: { paymentId },
          _sum: { allocatedAmount: true },
        });
        let currentAllocated = paymentAllocAgg._sum.allocatedAmount ?? 0;

        const created: PaymentAllocation[] = [];

        for (const alloc of allocInputs) {
          // 予約存在チェック + 精算額チェック
          const reservation = await tx.reservation.findUnique({
            where: { id: alloc.reservationId },
            select: {
              id: true,
              actualAmount: true,
              taxAmount: true,
              status: true,
            },
          });
          if (!reservation) {
            throw new ValidationError("指定された予約が見つかりません");
          }
          if (!reservation.actualAmount) {
            throw new ValidationError("精算済みの予約のみ消込できます");
          }

          // 入金残額チェック
          currentAllocated += alloc.allocatedAmount;
          if (currentAllocated > payment.amount) {
            throw new ValidationError(
              "消込合計が入金額を超えています",
            );
          }

          // 予約残額チェック
          const { remaining } = await _getReservationRemaining(
            tx,
            alloc.reservationId,
          );
          if (alloc.allocatedAmount > remaining) {
            throw new ValidationError(
              "消込金額が予約の残額を超えています",
            );
          }

          const record = await tx.paymentAllocation.create({
            data: {
              paymentId,
              reservationId: alloc.reservationId,
              invoiceId: alloc.invoiceId ?? null,
              allocatedAmount: alloc.allocatedAmount,
            },
            include: { reservation: true, payment: true },
          });
          created.push(record);
        }

        // ステータス再計算
        await _recalcStatus(tx, paymentId);

        return created;
      });

      return allocations;
    } catch (e: unknown) {
      if (
        e instanceof ValidationError ||
        e instanceof PermissionError ||
        e instanceof NotFoundError
      ) {
        throw e;
      }
      if (isPrismaUniqueError(e)) {
        throw new ValidationError(
          "同一入金に同じ予約を複数消込できません",
        );
      }
      throw e;
    }
  },

  /** 消込金額更新 */
  async updateAllocation(
    allocationId: string,
    input: unknown,
  ): Promise<PaymentAllocation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = addAllocationSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const data = parsed.data;

    const existing = await prisma.paymentAllocation.findUnique({
      where: { id: allocationId },
      include: { payment: true, reservation: true },
    });
    if (!existing) {
      throw new NotFoundError("消込が見つかりません");
    }

    const allocation = await prisma.$transaction(async (tx) => {
      // 入金残額チェック（既存分を除いた合計 + 新金額）
      const paymentAllocAgg = await tx.paymentAllocation.aggregate({
        where: {
          paymentId: existing.paymentId,
          id: { not: allocationId },
        },
        _sum: { allocatedAmount: true },
      });
      const otherAllocated = paymentAllocAgg._sum.allocatedAmount ?? 0;
      if (otherAllocated + data.allocatedAmount > existing.payment.amount) {
        throw new ValidationError(
          "消込金額が入金の残額を超えています",
        );
      }

      // 予約残額チェック（既存分を除いた合計 + 新金額）
      const { remaining } = await _getReservationRemaining(
        tx,
        existing.reservationId,
        allocationId,
      );
      if (data.allocatedAmount > remaining) {
        throw new ValidationError(
          "消込金額が予約の残額を超えています",
        );
      }

      const updated = await tx.paymentAllocation.update({
        where: { id: allocationId },
        data: {
          allocatedAmount: data.allocatedAmount,
        },
        include: { reservation: true, payment: true },
      });

      // ステータス再計算
      await _recalcStatus(tx, existing.paymentId);

      return updated;
    });

    return allocation;
  },

  /** 消込削除 */
  async removeAllocation(allocationId: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.paymentAllocation.findUnique({
      where: { id: allocationId },
      select: { id: true, paymentId: true },
    });
    if (!existing) {
      throw new NotFoundError("消込が見つかりません");
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentAllocation.delete({ where: { id: allocationId } });
      await _recalcStatus(tx, existing.paymentId);
    });
  },

  /** 予約の入金状況サマリ */
  async getReservationPaymentSummary(reservationId: string): Promise<{
    totalAmount: number;
    allocatedAmount: number;
    remainingAmount: number;
  }> {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { actualAmount: true, taxAmount: true },
    });
    if (!reservation) {
      throw new NotFoundError("予約が見つかりません");
    }

    const totalAmount =
      (reservation.actualAmount ?? 0) + (reservation.taxAmount ?? 0);

    const agg = await prisma.paymentAllocation.aggregate({
      where: { reservationId },
      _sum: { allocatedAmount: true },
    });
    const allocatedAmount = agg._sum.allocatedAmount ?? 0;

    return {
      totalAmount,
      allocatedAmount,
      remainingAmount: totalAmount - allocatedAmount,
    };
  },

  /** 精算済み・未全額消込の予約一覧（消込 Dialog 用） */
  async getUnallocatedReservations(): Promise<
    Array<{
      id: string;
      reservationCode: string;
      customerName: string;
      actualAmount: number;
      taxAmount: number;
      allocatedAmount: number;
      remainingAmount: number;
      invoices: Array<{ id: string; invoiceNumber: string }>;
    }>
  > {
    const reservations = await prisma.reservation.findMany({
      where: {
        actualAmount: { not: null },
        status: "SETTLED",
      },
      select: {
        id: true,
        reservationCode: true,
        customerName: true,
        actualAmount: true,
        taxAmount: true,
        allocations: {
          select: { allocatedAmount: true },
        },
        invoices: {
          select: { id: true, invoiceNumber: true, status: true },
          where: { status: { in: ["ISSUED", "OVERDUE"] } },
        },
      },
      orderBy: { settledAt: "desc" },
      take: 200,
    });

    return reservations
      .map((r) => {
        const totalAmount =
          (r.actualAmount ?? 0) + (r.taxAmount ?? 0);
        const allocatedAmount = r.allocations.reduce(
          (sum: number, a: { allocatedAmount: number }) =>
            sum + a.allocatedAmount,
          0,
        );
        const remainingAmount = totalAmount - allocatedAmount;
        return {
          id: r.id,
          reservationCode: r.reservationCode,
          customerName: r.customerName,
          actualAmount: r.actualAmount ?? 0,
          taxAmount: r.taxAmount ?? 0,
          allocatedAmount,
          remainingAmount,
          invoices: r.invoices.map((inv) => ({ id: inv.id, invoiceNumber: inv.invoiceNumber })),
        };
      })
      .filter((r) => r.remainingAmount > 0);
  },
};
