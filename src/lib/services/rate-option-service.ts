/**
 * 料金オプション（RateOption）のサービス層
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { createRateOptionSchema } from "@/lib/validations/rate-option";
import { ValidationError, NotFoundError, PermissionError } from "@/lib/errors";
import type { RateOption, Prisma } from "@/generated/prisma/client";

function toFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }
  return fieldErrors;
}

function isPrismaUniqueError(e: unknown): e is { code: string; meta?: { target?: string[] } } {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}

export const rateOptionService = {
  async list(params: {
    where?: Prisma.RateOptionWhereInput;
    orderBy?: Prisma.RateOptionOrderByWithRelationInput | Prisma.RateOptionOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  } = {}): Promise<{ data: RateOption[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.rateOption.findMany({
        where: params.where,
        orderBy: params.orderBy ?? { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: { _count: { select: { reservationOptions: true } } },
      }),
      prisma.rateOption.count({ where: params.where }),
    ]);
    return { data, total };
  },

  async get(id: string): Promise<RateOption | null> {
    return prisma.rateOption.findUnique({
      where: { id },
      include: { _count: { select: { reservationOptions: true } } },
    });
  },

  async create(input: unknown): Promise<RateOption> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) throw new PermissionError("権限がありません");

    const parsed = createRateOptionSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));

    try {
      return await prisma.rateOption.create({
        data: {
          optionName: parsed.data.optionName,
          price: parsed.data.price,
          isActive: parsed.data.isActive,
        },
      });
    } catch (e) {
      if (isPrismaUniqueError(e)) {
        throw new ValidationError("このオプション名は既に登録されています", { optionName: ["このオプション名は既に登録されています"] });
      }
      throw e;
    }
  },

  async update(id: string, input: unknown): Promise<RateOption> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) throw new PermissionError("権限がありません");

    const parsed = createRateOptionSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));

    const existing = await prisma.rateOption.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("オプションが見つかりません");

    try {
      return await prisma.rateOption.update({
        where: { id },
        data: {
          optionName: parsed.data.optionName,
          price: parsed.data.price,
          isActive: parsed.data.isActive,
        },
      });
    } catch (e) {
      if (isPrismaUniqueError(e)) {
        throw new ValidationError("このオプション名は既に登録されています", { optionName: ["このオプション名は既に登録されています"] });
      }
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) throw new PermissionError("削除にはマネージャー以上の権限が必要です");

    const existing = await prisma.rateOption.findUnique({
      where: { id },
      include: { _count: { select: { reservationOptions: true } } },
    });
    if (!existing) throw new NotFoundError("オプションが見つかりません");

    const count = (existing as unknown as { _count: { reservationOptions: number } })._count.reservationOptions;
    if (count > 0) {
      throw new ValidationError(`このオプションは${count}件の予約で使用されているため削除できません`);
    }

    await prisma.rateOption.delete({ where: { id } });
  },
};
