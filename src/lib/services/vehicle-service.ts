/**
 * 車両データ（Vehicle）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { createVehicleSchema, type CreateVehicleInput } from "@/lib/validations/vehicle";
import { ValidationError, PermissionError } from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import "@/lib/events/handlers";
import type { Vehicle, Prisma } from "@/generated/prisma/client";

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

/** Prisma P2002 (unique constraint violation) の判定 */
function isPrismaUniqueError(e: unknown): e is { code: string; meta?: { target?: string[] } } {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

/** フォーム入力 → Prisma create data への変換 */
function toCreateData(input: CreateVehicleInput) {
  return {
    plateNumber: input.plateNumber ?? null,
    vin: input.vin ?? null,
    maker: input.maker,
    modelName: input.modelName,
    year: input.year,
    color: input.color ?? null,
    mileage: input.mileage ?? 0,
    status: input.status ?? "IN_STOCK",
    officeId: input.officeId,
    vehicleClassId: input.vehicleClassId ?? null,
  };
}

/** unique 違反時のエラーメッセージ生成 */
function uniqueViolationError(e: { meta?: { target?: string[] } }): ValidationError {
  const target = e.meta?.target;
  if (target?.includes("vehicleCode")) {
    return new ValidationError(
      "車両コードが重複しています",
    );
  }
  // デフォルトは vin
  return new ValidationError(
    "この車台番号は既に登録されています",
    { vin: ["この車台番号は既に登録されています"] },
  );
}

export const vehicleService = {
  /** 車両一覧取得 */
  async list(params: {
    where?: Prisma.VehicleWhereInput;
    orderBy?: Prisma.VehicleOrderByWithRelationInput | Prisma.VehicleOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: Vehicle[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.vehicle.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: { office: true },
      }),
      prisma.vehicle.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /** 車両単体取得 */
  async get(id: string): Promise<Vehicle | null> {
    return prisma.vehicle.findUnique({
      where: { id },
      include: {
        office: true,
        parkingSpot: {
          include: { parkingLot: true },
        },
      },
    });
  },

  /** 車両データを作成 */
  async create(input: unknown): Promise<Vehicle> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createVehicleSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));
    }

    const data = toCreateData(parsed.data);

    try {
      // 自動採番: VH-NNNNN
      const last = await prisma.vehicle.findFirst({
        orderBy: { vehicleCode: "desc" },
        select: { vehicleCode: true },
      });
      const nextNum = last
        ? parseInt(last.vehicleCode.replace("VH-", ""), 10) + 1
        : 1;
      const vehicleCode = `VH-${String(nextNum).padStart(5, "0")}`;

      const vehicle = await prisma.vehicle.create({
        data: { vehicleCode, ...data },
      });
      await eventBus.emit("vehicle.created", { vehicle, userId: user.id });
      return vehicle;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /** 車両データを更新 */
  async update(id: string, input: unknown): Promise<Vehicle> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createVehicleSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));
    }

    const data = toCreateData(parsed.data);

    try {
      const vehicle = await prisma.vehicle.update({ where: { id }, data });
      await eventBus.emit("vehicle.updated", { vehicle, userId: user.id });
      return vehicle;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /** 車両データを削除（MANAGER 以上のみ） */
  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError("削除にはマネージャー以上の権限が必要です");
    }

    await prisma.vehicle.delete({ where: { id } });
    await eventBus.emit("vehicle.deleted", { id, userId: user.id });
  },

  /** 車両に紐づく関連レコード取得（関連リスト用） */
  async getRelatedRecords(vehicleId: string) {
    const [reservations, reservationsCount, leaseLines, leaseLinesCount] = await Promise.all([
      prisma.reservation.findMany({
        where: { vehicleId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          reservationCode: true,
          pickupDate: true,
          returnDate: true,
          customerName: true,
          actualAmount: true,
          status: true,
          approvalStatus: true,
        },
      }),
      prisma.reservation.count({ where: { vehicleId } }),
      prisma.leaseContractLine.findMany({
        where: { vehicleId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { contract: true },
      }),
      prisma.leaseContractLine.count({ where: { vehicleId } }),
    ]);
    return { reservations, reservationsCount, leaseLines, leaseLinesCount };
  },
};
