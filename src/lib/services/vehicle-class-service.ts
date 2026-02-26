/**
 * 車両クラス（VehicleClass）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import {
  createVehicleClassSchema,
  updateVehicleClassSchema,
  type CreateVehicleClassInput,
} from "@/lib/validations/vehicle-class";
import { ValidationError, NotFoundError, PermissionError } from "@/lib/errors";
import "@/lib/events/handlers";
import type { VehicleClass, Prisma } from "@/generated/prisma/client";

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

/** unique 違反時のエラーメッセージ生成 */
function uniqueViolationError(e: { meta?: { target?: string[] } }): ValidationError {
  const target = e.meta?.target;
  if (target?.includes("classCode")) {
    return new ValidationError("クラスコードが重複しています");
  }
  if (target?.includes("className")) {
    return new ValidationError(
      "このクラス名は既に登録されています",
      { className: ["このクラス名は既に登録されています"] },
    );
  }
  return new ValidationError("一意制約違反です");
}

export const vehicleClassService = {
  /** 車両クラス一覧取得（sortOrder 昇順） */
  async list(params: {
    where?: Prisma.VehicleClassWhereInput;
    orderBy?: Prisma.VehicleClassOrderByWithRelationInput | Prisma.VehicleClassOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  } = {}): Promise<{ data: VehicleClass[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.vehicleClass.findMany({
        where: params.where,
        orderBy: params.orderBy ?? { sortOrder: "asc" },
        skip: params.skip,
        take: params.take,
        include: {
          _count: { select: { vehicles: true } },
        },
      }),
      prisma.vehicleClass.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /** 車両クラス単体取得（vehicles count を include） */
  async get(id: string): Promise<VehicleClass | null> {
    return prisma.vehicleClass.findUnique({
      where: { id },
      include: {
        _count: { select: { vehicles: true, ratePlans: true, reservations: true } },
      },
    });
  },

  /** 車両クラスを作成（CL-NNNNN 自動採番） */
  async create(input: unknown): Promise<VehicleClass> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createVehicleClassSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));
    }

    try {
      // 自動採番: CL-NNNNN
      const last = await prisma.vehicleClass.findFirst({
        orderBy: { classCode: "desc" },
        select: { classCode: true },
      });
      const nextNum = last
        ? parseInt(last.classCode.replace("CL-", ""), 10) + 1
        : 1;
      const classCode = `CL-${String(nextNum).padStart(5, "0")}`;

      const vehicleClass = await prisma.vehicleClass.create({
        data: {
          classCode,
          className: parsed.data.className,
          description: parsed.data.description ?? null,
          sortOrder: parsed.data.sortOrder,
        },
      });

      return vehicleClass;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /** 車両クラスを更新 */
  async update(id: string, input: unknown): Promise<VehicleClass> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = updateVehicleClassSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));
    }

    // 存在確認
    const existing = await prisma.vehicleClass.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("車両クラスが見つかりません");
    }

    try {
      const vehicleClass = await prisma.vehicleClass.update({
        where: { id },
        data: {
          className: parsed.data.className,
          description: parsed.data.description ?? null,
          sortOrder: parsed.data.sortOrder,
        },
      });

      return vehicleClass;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError(e);
      }
      throw e;
    }
  },

  /** 車両クラスを削除（MANAGER 以上のみ、関連車両がある場合は削除不可） */
  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError("削除にはマネージャー以上の権限が必要です");
    }

    // 存在確認
    const existing = await prisma.vehicleClass.findUnique({
      where: { id },
      include: {
        _count: { select: { vehicles: true, ratePlans: true, reservations: true } },
      },
    });
    if (!existing) {
      throw new NotFoundError("車両クラスが見つかりません");
    }

    // 関連車両がある場合は削除不可
    const counts = (existing as unknown as { _count: { vehicles: number; ratePlans: number; reservations: number } })._count;
    if (counts.vehicles > 0) {
      throw new ValidationError(
        `この車両クラスには ${counts.vehicles} 台の車両が紐づいているため削除できません`,
      );
    }
    if (counts.ratePlans > 0) {
      throw new ValidationError(
        `この車両クラスには ${counts.ratePlans} 件の料金プランが紐づいているため削除できません`,
      );
    }
    if (counts.reservations > 0) {
      throw new ValidationError(
        `この車両クラスには ${counts.reservations} 件の予約が紐づいているため削除できません`,
      );
    }

    await prisma.vehicleClass.delete({ where: { id } });
  },
};
