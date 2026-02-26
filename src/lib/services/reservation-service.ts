/**
 * 予約管理（Reservation）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import "@/lib/events/handlers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import {
  createReservationSchema,
  updateReservationSchema,
} from "@/lib/validations/reservation";
import {
  ValidationError,
  NotFoundError,
  PermissionError,
} from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import type { Reservation, Prisma } from "@/generated/prisma/client";

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
  if (target?.includes("reservationCode")) {
    return new ValidationError("予約コードが重複しています");
  }
  return new ValidationError("一意制約違反です");
}

/** RS-NNNNN 形式の自動採番 */
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

// ---------------------------------------------------------------------------
// サービス
// ---------------------------------------------------------------------------

export const reservationService = {
  /**
   * 予約一覧取得（ページネーション + ステータスフィルタ + 検索）
   */
  async list(params: {
    where?: Prisma.ReservationWhereInput;
    orderBy?:
      | Prisma.ReservationOrderByWithRelationInput
      | Prisma.ReservationOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  } = {}): Promise<{ data: Reservation[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.reservation.findMany({
        where: params.where,
        orderBy: params.orderBy ?? { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: {
          vehicleClass: true,
          pickupOffice: true,
          vehicle: true,
        },
      }),
      prisma.reservation.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /**
   * 予約詳細取得
   */
  async get(id: string): Promise<Reservation | null> {
    return prisma.reservation.findUnique({
      where: { id },
      include: {
        vehicleClass: true,
        vehicle: true,
        pickupOffice: true,
        returnOffice: true,
        options: {
          include: { option: true },
        },
        invoices: true,
        account: true,
      },
    });
  },

  /**
   * 予約作成（RS-NNNNN 自動採番）
   */
  async create(input: unknown): Promise<Reservation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createReservationSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    try {
      const reservationCode = await nextReservationCode();

      const reservation = await prisma.reservation.create({
        data: {
          reservationCode,
          vehicleClassId: parsed.data.vehicleClassId,
          vehicleId: parsed.data.vehicleId ?? null,
          customerName: parsed.data.customerName,
          customerNameKana: parsed.data.customerNameKana,
          customerPhone: parsed.data.customerPhone,
          customerEmail: parsed.data.customerEmail || null,
          pickupDate: parsed.data.pickupDate,
          returnDate: parsed.data.returnDate,
          pickupOfficeId: parsed.data.pickupOfficeId,
          returnOfficeId: parsed.data.returnOfficeId,
          estimatedAmount: parsed.data.estimatedAmount ?? null,
          note: parsed.data.note ?? null,
          customerCode: parsed.data.customerCode ?? null,
          entityType: parsed.data.entityType ?? null,
          companyCode: parsed.data.companyCode ?? null,
          channel: parsed.data.channel ?? null,
          accountId: parsed.data.accountId ?? null,
        },
        include: {
          vehicleClass: true,
          pickupOffice: true,
          returnOffice: true,
        },
      });

      await eventBus.emit("reservation.created", {
        reservation,
        userId: user.id,
      });

      return reservation;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /**
   * 予約更新（RESERVED / CONFIRMED ステータスのみ編集可）
   */
  async update(id: string, input: unknown): Promise<Reservation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = updateReservationSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    // 存在確認 + ステータスチェック
    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("予約が見つかりません");
    }

    if (!["RESERVED", "CONFIRMED"].includes(existing.status)) {
      throw new ValidationError(
        `ステータスが「${existing.status}」の予約は編集できません`,
      );
    }

    try {
      const reservation = await prisma.reservation.update({
        where: { id },
        data: {
          vehicleClassId: parsed.data.vehicleClassId,
          vehicleId: parsed.data.vehicleId ?? null,
          customerName: parsed.data.customerName,
          customerNameKana: parsed.data.customerNameKana,
          customerPhone: parsed.data.customerPhone,
          customerEmail: parsed.data.customerEmail || null,
          pickupDate: parsed.data.pickupDate,
          returnDate: parsed.data.returnDate,
          pickupOfficeId: parsed.data.pickupOfficeId,
          returnOfficeId: parsed.data.returnOfficeId,
          estimatedAmount: parsed.data.estimatedAmount ?? null,
          note: parsed.data.note ?? null,
          customerCode: parsed.data.customerCode ?? null,
          entityType: parsed.data.entityType ?? null,
          companyCode: parsed.data.companyCode ?? null,
          channel: parsed.data.channel ?? null,
          accountId: parsed.data.accountId ?? null,
        },
        include: {
          vehicleClass: true,
          pickupOffice: true,
          returnOffice: true,
        },
      });

      await eventBus.emit("reservation.updated", {
        reservation,
        userId: user.id,
      });

      return reservation;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /**
   * 予約キャンセル（RESERVED / CONFIRMED のみ）
   *
   * 配車済み車両があっても Vehicle.status は変更しない
   * （まだ出発していないため RENTED にはなっていない）
   */
  async cancel(id: string): Promise<Reservation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("予約が見つかりません");
    }

    if (!["RESERVED", "CONFIRMED"].includes(existing.status)) {
      throw new ValidationError(
        `ステータスが「${existing.status}」の予約はキャンセルできません`,
      );
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: "CANCELLED",
        vehicleId: null,
      },
      include: {
        vehicleClass: true,
        pickupOffice: true,
        returnOffice: true,
      },
    });

    await eventBus.emit("reservation.cancelled", {
      reservation,
      userId: user.id,
    });

    return reservation;
  },

  /**
   * 車両割当
   *
   * 1. 予約が RESERVED ステータスか確認
   * 2. 車両が指定の vehicleClass に属するか確認
   * 3. ダブルブッキングチェック（同一車両 x アクティブ予約 x 期間重複）
   * 4. reservation.vehicleId を設定、status を CONFIRMED に変更
   * 5. Vehicle.status は変更しない（出発時に RENTED にする）
   */
  async assignVehicle(
    reservationId: string,
    vehicleId: string,
  ): Promise<Reservation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    // 予約の存在確認 + ステータスチェック
    const existing = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!existing) {
      throw new NotFoundError("予約が見つかりません");
    }

    if (existing.status !== "RESERVED") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の予約には車両を割り当てられません。ステータスが「RESERVED」の予約のみ割当可能です`,
      );
    }

    // 車両の存在確認 + vehicleClass チェック
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundError("車両が見つかりません");
    }

    if (vehicle.vehicleClassId !== existing.vehicleClassId) {
      throw new ValidationError(
        "この車両は予約の車両クラスに属していません",
      );
    }

    // ダブルブッキングチェック
    const conflict = await prisma.reservation.findFirst({
      where: {
        vehicleId,
        id: { not: reservationId },
        status: { in: ["RESERVED", "CONFIRMED", "DEPARTED"] },
        pickupDate: { lt: existing.returnDate },
        returnDate: { gt: existing.pickupDate },
      },
    });
    if (conflict) {
      throw new ValidationError(
        `この車両は ${conflict.reservationCode} で予約済みです`,
      );
    }

    // 割当実行
    const reservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        vehicleId,
        status: "CONFIRMED",
      },
      include: {
        vehicleClass: true,
        vehicle: true,
        pickupOffice: true,
        returnOffice: true,
      },
    });

    await eventBus.emit("reservation.vehicleAssigned", {
      reservation,
      userId: user.id,
    });

    return reservation;
  },

  /**
   * 車両割当解除（CONFIRMED → RESERVED に戻す）
   */
  async unassignVehicle(reservationId: string): Promise<Reservation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!existing) {
      throw new NotFoundError("予約が見つかりません");
    }

    if (existing.status !== "CONFIRMED") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の予約は割当解除できません。ステータスが「CONFIRMED」の予約のみ解除可能です`,
      );
    }

    const reservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        vehicleId: null,
        status: "RESERVED",
      },
      include: {
        vehicleClass: true,
        pickupOffice: true,
        returnOffice: true,
      },
    });

    return reservation;
  },

  /**
   * 出発（貸渡）処理
   *
   * 1. CONFIRMED ステータスのみ許可
   * 2. 車両が割当済みであること
   * 3. reservation を DEPARTED に更新、actualPickupDate と departureOdometer を記録
   * 4. vehicle.status を RENTED に、mileage を departureOdometer に更新
   */
  async depart(
    reservationId: string,
    input: { actualPickupDate: Date; departureOdometer: number },
  ): Promise<Reservation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!existing) {
      throw new NotFoundError("予約が見つかりません");
    }

    if (existing.status !== "CONFIRMED") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の予約は出発処理できません。ステータスが「CONFIRMED」の予約のみ出発可能です`,
      );
    }

    if (!existing.vehicleId) {
      throw new ValidationError(
        "車両が割り当てられていません。出発前に車両を割り当ててください",
      );
    }

    const vehicleId = existing.vehicleId;

    const reservation = await prisma.$transaction(async (tx) => {
      // 予約を DEPARTED に更新
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: "DEPARTED",
          actualPickupDate: input.actualPickupDate,
          departureOdometer: input.departureOdometer,
        },
        include: {
          vehicleClass: true,
          vehicle: true,
          pickupOffice: true,
          returnOffice: true,
        },
      });

      // 車両を RENTED に、走行距離を更新
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          status: "RENTED",
          mileage: input.departureOdometer,
        },
      });

      return updated;
    });

    await eventBus.emit("reservation.departed", {
      reservation,
      userId: user.id,
    });

    return reservation;
  },

  /**
   * 帰着（返却）処理
   *
   * DEPARTED → RETURNED
   * 1. 走行距離/燃料レベル記録
   * 2. Vehicle.status → IN_STOCK, mileage 更新
   * 3. actualAmount を rate-calculator で自動計算（オプション）
   */
  async return(
    reservationId: string,
    input: {
      actualReturnDate: Date;
      returnOdometer: number;
      fuelLevelAtReturn?: string | null;
    },
  ): Promise<Reservation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { vehicleClass: true, vehicle: true },
    });
    if (!existing) {
      throw new NotFoundError("予約が見つかりません");
    }

    if (existing.status !== "DEPARTED") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の予約は帰着処理できません。ステータスが「DEPARTED」の予約のみ帰着可能です`,
      );
    }

    if (!existing.vehicleId) {
      throw new ValidationError(
        "車両が割り当てられていません",
      );
    }

    if (
      existing.departureOdometer != null &&
      input.returnOdometer < existing.departureOdometer
    ) {
      throw new ValidationError(
        "帰着時走行距離は出発時走行距離以上である必要があります",
      );
    }

    const vehicleId = existing.vehicleId;

    const reservation = await prisma.$transaction(async (tx) => {
      // 予約を RETURNED に更新
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: "RETURNED",
          actualReturnDate: input.actualReturnDate,
          returnOdometer: input.returnOdometer,
          fuelLevelAtReturn: input.fuelLevelAtReturn ?? null,
        },
        include: {
          vehicleClass: true,
          vehicle: true,
          pickupOffice: true,
          returnOffice: true,
        },
      });

      // 車両を IN_STOCK に戻し、走行距離を更新
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          status: "IN_STOCK",
          mileage: input.returnOdometer,
        },
      });

      return updated;
    });

    await eventBus.emit("reservation.returned", {
      reservation,
      userId: user.id,
    });

    return reservation;
  },

  /**
   * 精算処理
   *
   * RETURNED → SETTLED
   * 最終金額を確定し、Payment を自動作成する。
   */
  async settle(
    reservationId: string,
    input: {
      actualAmount: number;
      paymentCategory?: string;
      note?: string | null;
    },
  ): Promise<Reservation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!existing) {
      throw new NotFoundError("予約が見つかりません");
    }

    if (existing.status !== "RETURNED") {
      throw new ValidationError(
        `ステータスが「${existing.status}」の予約は精算処理できません。ステータスが「RETURNED」の予約のみ精算可能です`,
      );
    }

    if (input.actualAmount < 0) {
      throw new ValidationError("精算金額は0以上である必要があります");
    }

    const now = new Date();
    // entityType が 1（個人）の場合は精算日を売上計上日に設定
    // entityType が 2（法人）の場合は Invoice 作成時に設定されるため、ここでは設定しない
    const isIndividual = existing.entityType === 1;

    const reservation = await prisma.$transaction(async (tx) => {
      // 予約を SETTLED に更新
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: "SETTLED",
          actualAmount: input.actualAmount,
          settledAt: now,
          ...(isIndividual ? { revenueDate: now } : {}),
          note: input.note ?? existing.note,
        },
        include: {
          vehicleClass: true,
          vehicle: true,
          pickupOffice: true,
          returnOffice: true,
        },
      });

      // Payment 自動作成（PM-NNNNN 自動採番）
      const lastPayment = await tx.payment.findFirst({
        orderBy: { paymentNumber: "desc" },
        select: { paymentNumber: true },
      });
      const nextNum = lastPayment
        ? parseInt(lastPayment.paymentNumber.replace("PM-", ""), 10) + 1
        : 1;
      const paymentNumber = `PM-${String(nextNum).padStart(5, "0")}`;

      const category = (input.paymentCategory ?? "CASH") as import("@/generated/prisma/client").PaymentCategory;

      await tx.payment.create({
        data: {
          paymentNumber,
          paymentDate: new Date(),
          amount: input.actualAmount,
          paymentCategory: category,
          payerName: existing.customerName,
          status: "UNALLOCATED",
        },
      });

      return updated;
    });

    await eventBus.emit("reservation.settled", {
      reservation,
      userId: user.id,
    });

    return reservation;
  },

  /**
   * 予約承認（MANAGER 権限必須）
   *
   * approvalStatus が PENDING の予約のみ承認可能。
   */
  async approve(
    id: string,
    input: { comment?: string } = {},
  ): Promise<Reservation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError("承認にはマネージャー以上の権限が必要です");
    }

    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("予約が見つかりません");
    }

    if (existing.approvalStatus !== "PENDING") {
      throw new ValidationError(
        "この予約は既に承認/却下されています",
      );
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        approvalStatus: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
        approvalComment: input.comment ?? null,
      },
      include: {
        vehicleClass: true,
        pickupOffice: true,
        returnOffice: true,
      },
    });

    await eventBus.emit("reservation.approved", {
      reservation,
      userId: user.id,
    });

    return reservation;
  },

  /**
   * 予約却下（MANAGER 権限必須）
   *
   * approvalStatus が PENDING の予約のみ却下可能。
   */
  async reject(
    id: string,
    input: { comment?: string } = {},
  ): Promise<Reservation> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError("却下にはマネージャー以上の権限が必要です");
    }

    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("予約が見つかりません");
    }

    if (existing.approvalStatus !== "PENDING") {
      throw new ValidationError(
        "この予約は既に承認/却下されています",
      );
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        approvalStatus: "REJECTED",
        approvedById: user.id,
        approvedAt: new Date(),
        approvalComment: input.comment ?? null,
      },
      include: {
        vehicleClass: true,
        pickupOffice: true,
        returnOffice: true,
      },
    });

    await eventBus.emit("reservation.rejected", {
      reservation,
      userId: user.id,
    });

    return reservation;
  },
};
