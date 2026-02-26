/**
 * 担当営業（SalesRepAssignment）のサービス層
 *
 * ビジネスロジックをここに集約。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import { prisma } from "@/lib/prisma";
import type { Prisma, SalesRepAssignment } from "@/generated/prisma/client";

export const salesRepService = {
  /** 担当営業一覧取得 */
  async list(params: {
    where?: Prisma.SalesRepAssignmentWhereInput;
    orderBy?: Prisma.SalesRepAssignmentOrderByWithRelationInput | Prisma.SalesRepAssignmentOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: SalesRepAssignment[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.salesRepAssignment.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
      }),
      prisma.salesRepAssignment.count({ where: params.where }),
    ]);
    return { data, total };
  },
};
