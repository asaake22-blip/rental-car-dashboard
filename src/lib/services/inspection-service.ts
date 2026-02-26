/**
 * 点検・整備記録（VehicleInspection）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { createInspectionSchema, type CreateInspectionInput } from "@/lib/validations/inspection";
import { ValidationError, NotFoundError, PermissionError } from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import "@/lib/events/handlers";
import type { VehicleInspection, Prisma } from "@/generated/prisma/client";

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

/** フォーム入力 → Prisma create data への変換 */
function toCreateData(input: CreateInspectionInput) {
  return {
    vehicleId: input.vehicleId,
    inspectionType: input.inspectionType,
    scheduledDate: new Date(input.scheduledDate),
    completedDate: input.completedDate ? new Date(input.completedDate) : null,
    isCompleted: input.isCompleted,
    note: input.note ?? null,
  };
}

/** バリデーション共通処理 */
function validateInput(input: unknown): CreateInspectionInput {
  const parsed = createInspectionSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));
  }

  // isCompleted=true なのに completedDate が未設定の場合
  if (parsed.data.isCompleted && !parsed.data.completedDate) {
    throw new ValidationError("完了済みの場合は実施日を入力してください", {
      completedDate: ["完了済みの場合は実施日を入力してください"],
    });
  }

  return parsed.data;
}

export const inspectionService = {
  /** 点検一覧取得（車両情報を含む） */
  async list(params: {
    where?: Prisma.VehicleInspectionWhereInput;
    orderBy?: Prisma.VehicleInspectionOrderByWithRelationInput | Prisma.VehicleInspectionOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: VehicleInspection[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.vehicleInspection.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: { vehicle: { include: { office: true } } },
      }),
      prisma.vehicleInspection.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /** 車両別点検記録取得 */
  async listByVehicle(vehicleId: string): Promise<VehicleInspection[]> {
    return prisma.vehicleInspection.findMany({
      where: { vehicleId },
      orderBy: { scheduledDate: "desc" },
      include: { vehicle: true },
    });
  },

  /** 点検記録単体取得 */
  async get(id: string): Promise<VehicleInspection | null> {
    return prisma.vehicleInspection.findUnique({
      where: { id },
      include: { vehicle: { include: { office: true } } },
    });
  },

  /** 点検記録作成 */
  async create(input: unknown): Promise<VehicleInspection> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const validated = validateInput(input);
    const data = toCreateData(validated);

    // 車両存在チェック
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundError("指定された車両が見つかりません");
    }

    const inspection = await prisma.vehicleInspection.create({ data });
    return inspection;
  },

  /** 点検記録更新 */
  async update(id: string, input: unknown): Promise<VehicleInspection> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.vehicleInspection.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("点検記録が見つかりません");
    }

    const validated = validateInput(input);
    const data = toCreateData(validated);

    const inspection = await prisma.vehicleInspection.update({
      where: { id },
      data,
    });

    return inspection;
  },

  /** 点検完了（isCompleted → true, completedDate → now） */
  async complete(id: string): Promise<VehicleInspection> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.vehicleInspection.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("点検記録が見つかりません");
    }
    if (existing.isCompleted) {
      throw new ValidationError("既に完了済みです");
    }

    const inspection = await prisma.vehicleInspection.update({
      where: { id },
      data: {
        isCompleted: true,
        completedDate: new Date(),
      },
    });

    await eventBus.emit("inspection.completed", { inspection, userId: user.id });
    return inspection;
  },

  /** 点検記録削除（MANAGER 以上） */
  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError("削除にはマネージャー以上の権限が必要です");
    }

    const existing = await prisma.vehicleInspection.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("点検記録が見つかりません");
    }

    await prisma.vehicleInspection.delete({ where: { id } });
  },

  /** 今後N日以内の未完了予定を取得 */
  async getUpcoming(days: number): Promise<VehicleInspection[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return prisma.vehicleInspection.findMany({
      where: {
        scheduledDate: {
          gte: now,
          lte: future,
        },
        isCompleted: false,
      },
      orderBy: { scheduledDate: "asc" },
      include: { vehicle: { include: { office: true } } },
    });
  },
};
