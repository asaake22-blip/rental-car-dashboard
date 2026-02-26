/**
 * 料金プラン（RatePlan）のサービス層
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { createRatePlanSchema } from "@/lib/validations/rate-plan";
import { ValidationError, NotFoundError, PermissionError } from "@/lib/errors";
import type { RatePlan, Prisma } from "@/generated/prisma/client";

function toFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }
  return fieldErrors;
}

export const ratePlanService = {
  async list(params: {
    where?: Prisma.RatePlanWhereInput;
    orderBy?: Prisma.RatePlanOrderByWithRelationInput | Prisma.RatePlanOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  } = {}): Promise<{ data: RatePlan[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.ratePlan.findMany({
        where: params.where,
        orderBy: params.orderBy ?? { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: { vehicleClass: true },
      }),
      prisma.ratePlan.count({ where: params.where }),
    ]);
    return { data, total };
  },

  async get(id: string): Promise<RatePlan | null> {
    return prisma.ratePlan.findUnique({
      where: { id },
      include: { vehicleClass: true },
    });
  },

  async create(input: unknown): Promise<RatePlan> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) throw new PermissionError("権限がありません");

    const parsed = createRatePlanSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));

    return prisma.ratePlan.create({
      data: {
        vehicleClassId: parsed.data.vehicleClassId,
        planName: parsed.data.planName,
        rateType: parsed.data.rateType,
        basePrice: parsed.data.basePrice,
        additionalHourPrice: parsed.data.additionalHourPrice,
        insurancePrice: parsed.data.insurancePrice,
        validFrom: parsed.data.validFrom,
        validTo: parsed.data.validTo ?? null,
        isActive: parsed.data.isActive,
      },
      include: { vehicleClass: true },
    });
  },

  async update(id: string, input: unknown): Promise<RatePlan> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) throw new PermissionError("権限がありません");

    const parsed = createRatePlanSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("入力内容に誤りがあります", toFieldErrors(parsed.error));

    const existing = await prisma.ratePlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("料金プランが見つかりません");

    return prisma.ratePlan.update({
      where: { id },
      data: {
        vehicleClassId: parsed.data.vehicleClassId,
        planName: parsed.data.planName,
        rateType: parsed.data.rateType,
        basePrice: parsed.data.basePrice,
        additionalHourPrice: parsed.data.additionalHourPrice,
        insurancePrice: parsed.data.insurancePrice,
        validFrom: parsed.data.validFrom,
        validTo: parsed.data.validTo ?? null,
        isActive: parsed.data.isActive,
      },
      include: { vehicleClass: true },
    });
  },

  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) throw new PermissionError("削除にはマネージャー以上の権限が必要です");

    const existing = await prisma.ratePlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("料金プランが見つかりません");

    await prisma.ratePlan.delete({ where: { id } });
  },
};
