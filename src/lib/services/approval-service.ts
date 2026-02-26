/**
 * 承認サービス層
 *
 * 予約の個別承認・一括承認のビジネスロジック。
 * Server Actions / REST API Route の両方から呼び出し可能。
 *
 * Order/Sale は廃止済み。承認対象は Reservation のみ。
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { bulkApprovalSchema } from "@/lib/validations/approval";
import { ValidationError, PermissionError } from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import { reservationService } from "@/lib/services/reservation-service";
import "@/lib/events/handlers";
import type { Prisma, Reservation } from "@/generated/prisma/client";

/** Zod エラーを fieldErrors に変換 */
function toFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }
  return fieldErrors;
}

export const approvalService = {
  /** サイドバー未承認バッジ用カウント */
  async getPendingCounts(): Promise<{ reservations: number }> {
    const reservations = await prisma.reservation.count({
      where: { approvalStatus: "PENDING" },
    });
    return { reservations };
  },

  /** 承認待ち予約一覧 */
  async listPendingReservations(params: {
    where?: Prisma.ReservationWhereInput;
    orderBy?: Prisma.ReservationOrderByWithRelationInput;
    skip?: number;
    take?: number;
  } = {}): Promise<{ data: Reservation[]; total: number }> {
    const where: Prisma.ReservationWhereInput = {
      ...params.where,
      approvalStatus: "PENDING" as const,
    };
    const [data, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        orderBy: params.orderBy ?? { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: {
          vehicleClass: true,
          pickupOffice: true,
        },
      }),
      prisma.reservation.count({ where }),
    ]);
    return { data, total };
  },

  /** 個別の承認/却下（reservation-service に委譲） */
  async approve(
    id: string,
    input: { status: "APPROVED" | "REJECTED"; comment?: string },
  ): Promise<Reservation> {
    if (input.status === "APPROVED") {
      return reservationService.approve(id, { comment: input.comment });
    } else {
      return reservationService.reject(id, { comment: input.comment });
    }
  },

  /** 一括承認/却下 */
  async bulkApprove(input: unknown): Promise<{ count: number }> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError("承認にはマネージャー以上の権限が必要です");
    }

    const parsed = bulkApprovalSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));
    }

    const { ids, status, comment } = parsed.data;

    const result = await prisma.reservation.updateMany({
      where: {
        id: { in: ids },
        approvalStatus: "PENDING",
      },
      data: {
        approvalStatus: status,
        approvedById: user.id,
        approvedAt: new Date(),
        approvalComment: comment ?? null,
      },
    });

    // 更新済みレコードを取得してイベント発火
    const eventType = status === "APPROVED" ? "reservation.approved" as const : "reservation.rejected" as const;
    const updatedReservations = await prisma.reservation.findMany({
      where: { id: { in: ids } },
    });
    for (const reservation of updatedReservations) {
      await eventBus.emit(eventType, { reservation, userId: user.id });
    }

    return { count: result.count };
  },
};
