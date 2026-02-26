/**
 * 目標データ（ReservationTarget / SalesTarget）のサービス層
 *
 * 予約目標・売上目標の2モデルを扱う。
 * Server Actions / REST API Route の両方から呼び出し可能。
 */

import { prisma } from "@/lib/prisma";
import type { Prisma, ReservationTarget, SalesTarget } from "@/generated/prisma/client";

export const targetService = {
  /** 予約目標一覧取得 */
  async listReservationTargets(params: {
    where?: Prisma.ReservationTargetWhereInput;
    orderBy?: Prisma.ReservationTargetOrderByWithRelationInput | Prisma.ReservationTargetOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: ReservationTarget[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.reservationTarget.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
      }),
      prisma.reservationTarget.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /** 売上目標一覧取得 */
  async listSalesTargets(params: {
    where?: Prisma.SalesTargetWhereInput;
    orderBy?: Prisma.SalesTargetOrderByWithRelationInput | Prisma.SalesTargetOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: SalesTarget[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.salesTarget.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
      }),
      prisma.salesTarget.count({ where: params.where }),
    ]);
    return { data, total };
  },
};
