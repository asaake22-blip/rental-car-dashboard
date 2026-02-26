/**
 * 駐車場（ParkingLot / ParkingSpot）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import {
  createParkingLotSchema,
  spotsJsonImportSchema,
  annotationsPayloadSchema,
  type CreateParkingLotInput,
  type SpotsJsonImportInput,
} from "@/lib/validations/parking";
import { ValidationError, NotFoundError, PermissionError } from "@/lib/errors";
import type { ParkingLot, ParkingSpot } from "@/generated/prisma/client";

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
function toCreateData(input: CreateParkingLotInput) {
  return {
    officeId: input.officeId,
    name: input.name,
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
  };
}

/** unique 違反時のエラーメッセージ生成 */
function uniqueViolationError(): ValidationError {
  return new ValidationError(
    "同じ事業所に同名の駐車場が既に登録されています",
    { name: ["同じ事業所に同名の駐車場が既に登録されています"] },
  );
}

export const parkingService = {
  /** 駐車場一覧取得 */
  async listLots(officeId?: string): Promise<ParkingLot[]> {
    const where = officeId ? { officeId } : {};
    return prisma.parkingLot.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        office: true,
        _count: { select: { spots: true } },
      },
    });
  },

  /** 駐車場単体取得（スポット + 車両情報を含む） */
  async getLot(id: string): Promise<ParkingLot | null> {
    return prisma.parkingLot.findUnique({
      where: { id },
      include: {
        office: true,
        spots: {
          orderBy: { spotNumber: "asc" },
          include: { vehicle: true },
        },
      },
    });
  },

  /** 駐車場を作成（MEMBER 以上） */
  async createLot(input: unknown): Promise<ParkingLot> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createParkingLotSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));
    }

    const data = toCreateData(parsed.data);

    try {
      return await prisma.parkingLot.create({ data });
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError();
      }
      throw e;
    }
  },

  /** 駐車場を更新 */
  async updateLot(id: string, input: unknown): Promise<ParkingLot> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.parkingLot.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("駐車場が見つかりません");
    }

    const parsed = createParkingLotSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));
    }

    const data = toCreateData(parsed.data);

    try {
      return await prisma.parkingLot.update({ where: { id }, data });
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError();
      }
      throw e;
    }
  },

  /** 駐車場を削除（MANAGER 以上。CASCADE で spots も削除） */
  async deleteLot(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError("削除にはマネージャー以上の権限が必要です");
    }

    const existing = await prisma.parkingLot.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("駐車場が見つかりません");
    }

    await prisma.parkingLot.delete({ where: { id } });
  },

  /** スポット JSON 一括インポート（既存 spots 全削除 → 新規作成、トランザクション） */
  async importSpots(lotId: string, spots: unknown): Promise<ParkingSpot[]> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    // 駐車場の存在チェック
    const lot = await prisma.parkingLot.findUnique({ where: { id: lotId } });
    if (!lot) {
      throw new NotFoundError("駐車場が見つかりません");
    }

    // バリデーション
    const parsed = spotsJsonImportSchema.safeParse(spots);
    if (!parsed.success) {
      throw new ValidationError("スポットデータに誤りがあります", toFieldErrors(parsed.error));
    }

    const validated: SpotsJsonImportInput = parsed.data;

    // スポット番号の重複チェック
    const numbers = validated.spots.map((s) => s.number);
    const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    if (duplicates.length > 0) {
      throw new ValidationError(
        `スポット番号が重複しています: ${[...new Set(duplicates)].join(", ")}`,
        { spots: [`スポット番号が重複しています: ${[...new Set(duplicates)].join(", ")}`] },
      );
    }

    // トランザクション：既存 spots 全削除 → 新規作成
    const created = await prisma.$transaction(async (tx) => {
      await tx.parkingSpot.deleteMany({ where: { parkingLotId: lotId } });

      const results: ParkingSpot[] = [];
      for (const spot of validated.spots) {
        const created = await tx.parkingSpot.create({
          data: {
            parkingLotId: lotId,
            spotNumber: spot.number,
            x: spot.x,
            y: spot.y,
            width: spot.width,
            height: spot.height,
            rotation: spot.rotation,
          },
        });
        results.push(created);
      }
      return results;
    });

    return created;
  },

  /** 車両割当/解除。vehicleId=null で解除。Vehicle.parkingSpotId を更新する */
  async assignVehicle(spotId: string, vehicleId: string | null): Promise<ParkingSpot> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    // スポットの存在チェック
    const spot = await prisma.parkingSpot.findUnique({
      where: { id: spotId },
      include: { vehicle: true },
    });
    if (!spot) {
      throw new NotFoundError("駐車スポットが見つかりません");
    }

    // 解除の場合：現在割り当てられている車両の parkingSpotId を null に
    if (vehicleId === null) {
      if (spot.vehicle) {
        await prisma.vehicle.update({
          where: { id: spot.vehicle.id },
          data: { parkingSpotId: null },
        });
      }
      return prisma.parkingSpot.findUniqueOrThrow({
        where: { id: spotId },
        include: { vehicle: true },
      });
    }

    // 割当の場合
    // 車両の存在チェック
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundError("車両が見つかりません");
    }

    // 既に別のスポットに割り当てられている場合は解除
    if (vehicle.parkingSpotId && vehicle.parkingSpotId !== spotId) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { parkingSpotId: null },
      });
    }

    // 現在のスポットに別の車両が割り当てられている場合は解除
    if (spot.vehicle && spot.vehicle.id !== vehicleId) {
      await prisma.vehicle.update({
        where: { id: spot.vehicle.id },
        data: { parkingSpotId: null },
      });
    }

    // 車両をスポットに割り当て
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { parkingSpotId: spotId },
    });

    return prisma.parkingSpot.findUniqueOrThrow({
      where: { id: spotId },
      include: { vehicle: true },
    });
  },

  /** スポットレイアウト保存（車両割当を保持、トランザクション） */
  async saveSpotLayout(lotId: string, input: unknown): Promise<ParkingSpot[]> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    // 駐車場の存在チェック
    const lot = await prisma.parkingLot.findUnique({ where: { id: lotId } });
    if (!lot) {
      throw new NotFoundError("駐車場が見つかりません");
    }

    // バリデーション（spotsJsonImportSchema を再利用）
    const parsed = spotsJsonImportSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("スポットデータに誤りがあります", toFieldErrors(parsed.error));
    }

    const validated: SpotsJsonImportInput = parsed.data;

    // スポット番号の重複チェック
    const numbers = validated.spots.map((s) => s.number);
    const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    if (duplicates.length > 0) {
      throw new ValidationError(
        `スポット番号が重複しています: ${[...new Set(duplicates)].join(", ")}`,
        { spots: [`スポット番号が重複しています: ${[...new Set(duplicates)].join(", ")}`] },
      );
    }

    // トランザクション：割当保持しつつレイアウト更新
    const created = await prisma.$transaction(async (tx) => {
      // 1. 既存スポットから spotNumber → vehicleId のマッピングを取得
      const existingSpots = await tx.parkingSpot.findMany({
        where: { parkingLotId: lotId },
        include: { vehicle: true },
      });
      const spotVehicleMap = new Map<string, string>();
      for (const spot of existingSpots) {
        if (spot.vehicle) {
          spotVehicleMap.set(spot.spotNumber, spot.vehicle.id);
        }
      }

      // 2. Vehicle.parkingSpotId を null にして既存割当を解除
      const vehicleIds = [...spotVehicleMap.values()];
      if (vehicleIds.length > 0) {
        await tx.vehicle.updateMany({
          where: { id: { in: vehicleIds } },
          data: { parkingSpotId: null },
        });
      }

      // 3. 既存スポットを全削除
      await tx.parkingSpot.deleteMany({ where: { parkingLotId: lotId } });

      // 4. 新スポットを一括作成
      const results: ParkingSpot[] = [];
      for (const spot of validated.spots) {
        const newSpot = await tx.parkingSpot.create({
          data: {
            parkingLotId: lotId,
            spotNumber: spot.number,
            x: spot.x,
            y: spot.y,
            width: spot.width,
            height: spot.height,
            rotation: spot.rotation,
          },
        });
        results.push(newSpot);
      }

      // 5. spotNumber が一致するスポットに車両を再割当
      for (const newSpot of results) {
        const vehicleId = spotVehicleMap.get(newSpot.spotNumber);
        if (vehicleId) {
          await tx.vehicle.update({
            where: { id: vehicleId },
            data: { parkingSpotId: newSpot.id },
          });
        }
      }

      return results;
    });

    return created;
  },

  /** アノテーション（駐車場形状データ）を保存 */
  async saveAnnotations(lotId: string, input: unknown): Promise<ParkingLot> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.parkingLot.findUnique({ where: { id: lotId } });
    if (!existing) {
      throw new NotFoundError("駐車場が見つかりません");
    }

    const parsed = annotationsPayloadSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("アノテーションデータに誤りがあります", toFieldErrors(parsed.error));
    }

    return prisma.parkingLot.update({
      where: { id: lotId },
      data: { annotations: parsed.data.annotations as any },
    });
  },
};
