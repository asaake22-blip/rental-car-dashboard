/**
 * 取引先企業（Company）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import { prisma } from "@/lib/prisma";
import type { Prisma, Company } from "@/generated/prisma/client";

export const companyService = {
  /** 企業一覧取得 */
  async list(params: {
    where?: Prisma.CompanyWhereInput;
    orderBy?: Prisma.CompanyOrderByWithRelationInput | Prisma.CompanyOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: Company[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.company.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
      }),
      prisma.company.count({ where: params.where }),
    ]);
    return { data, total };
  },
};
