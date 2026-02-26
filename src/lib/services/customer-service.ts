/**
 * 顧客（Customer）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import { prisma } from "@/lib/prisma";
import type { Prisma, Customer } from "@/generated/prisma/client";

export const customerService = {
  /** 顧客一覧取得 */
  async list(params: {
    where?: Prisma.CustomerWhereInput;
    orderBy?: Prisma.CustomerOrderByWithRelationInput | Prisma.CustomerOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: Customer[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
      }),
      prisma.customer.count({ where: params.where }),
    ]);
    return { data, total };
  },
};
