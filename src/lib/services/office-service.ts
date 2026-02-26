/**
 * 営業所（Office）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { createOfficeSchema, type CreateOfficeInput } from "@/lib/validations/office";
import { ValidationError, NotFoundError, PermissionError } from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import "@/lib/events/handlers";
import type { Office, Prisma } from "@/generated/prisma/client";

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
function toCreateData(input: CreateOfficeInput) {
  return {
    officeName: input.officeName,
    area: input.area ?? null,
  };
}

/** unique 違反時のエラーメッセージ生成 */
function uniqueViolationError(): ValidationError {
  return new ValidationError(
    "この営業所名は既に登録されています",
    { officeName: ["この営業所名は既に登録されています"] },
  );
}

export const officeService = {
  /** 営業所一覧取得（vehicles, parkingLots の件数を含む） */
  async list(params: {
    where?: Prisma.OfficeWhereInput;
    orderBy?: Prisma.OfficeOrderByWithRelationInput | Prisma.OfficeOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: Office[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.office.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: {
          _count: { select: { vehicles: true, parkingLots: true } },
        },
      }),
      prisma.office.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /** 営業所単体取得（vehicles, parkingLots を含む） */
  async get(id: string): Promise<Office | null> {
    return prisma.office.findUnique({
      where: { id },
      include: {
        vehicles: true,
        parkingLots: true,
      },
    });
  },

  /** 営業所を作成（MEMBER 以上） */
  async create(input: unknown): Promise<Office> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createOfficeSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));
    }

    const data = toCreateData(parsed.data);

    try {
      const office = await prisma.office.create({ data });
      await eventBus.emit("office.created", { office, userId: user.id });
      return office;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError();
      }
      throw e;
    }
  },

  /** 営業所を更新（MEMBER 以上） */
  async update(id: string, input: unknown): Promise<Office> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.office.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("営業所が見つかりません");
    }

    const parsed = createOfficeSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));
    }

    const data = toCreateData(parsed.data);

    try {
      const office = await prisma.office.update({ where: { id }, data });
      await eventBus.emit("office.updated", { office, userId: user.id });
      return office;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        throw uniqueViolationError();
      }
      throw e;
    }
  },

  /** 営業所を削除（MANAGER 以上。vehicles / parkingLots が存在する場合はエラー） */
  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError("削除にはマネージャー以上の権限が必要です");
    }

    const existing = await prisma.office.findUnique({
      where: { id },
      include: {
        _count: { select: { vehicles: true, parkingLots: true } },
      },
    });
    if (!existing) {
      throw new NotFoundError("営業所が見つかりません");
    }

    const counts = (existing as Office & { _count: { vehicles: number; parkingLots: number } })._count;
    if (counts.vehicles > 0) {
      throw new ValidationError(
        `この営業所には ${counts.vehicles} 台の車両が登録されています。先に車両を移動または削除してください`,
      );
    }
    if (counts.parkingLots > 0) {
      throw new ValidationError(
        `この営業所には ${counts.parkingLots} 件の駐車場が登録されています。先に駐車場を削除してください`,
      );
    }

    await prisma.office.delete({ where: { id } });
    await eventBus.emit("office.deleted", { id, userId: user.id });
  },

  /** 全件取得（Select 用。id + officeName のみ） */
  async listAll(): Promise<Pick<Office, "id" | "officeName">[]> {
    return prisma.office.findMany({
      select: { id: true, officeName: true },
      orderBy: { officeName: "asc" },
    });
  },
};
