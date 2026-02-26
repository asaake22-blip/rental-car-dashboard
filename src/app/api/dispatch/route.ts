/**
 * 配車表（ガントチャート）API
 *
 * GET /api/dispatch?start=2026-02-01&end=2026-03-01&officeId=xxx&vehicleClassId=xxx
 * 車両 + 予約データを返す
 */

import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { withAuth } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, _ctx) => {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const officeId = searchParams.get("officeId");
  const vehicleClassId = searchParams.get("vehicleClassId");

  // 日付の範囲デフォルト: 今月
  const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = end ? new Date(end) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  // 車両フィルタ
  const vehicleWhere: Record<string, unknown> = {
    status: { not: "RETIRED" },
  };
  if (officeId) vehicleWhere.officeId = officeId;
  if (vehicleClassId) vehicleWhere.vehicleClassId = vehicleClassId;

  const vehicles = await prisma.vehicle.findMany({
    where: vehicleWhere,
    orderBy: [{ vehicleCode: "asc" }],
    select: {
      id: true,
      vehicleCode: true,
      maker: true,
      modelName: true,
      plateNumber: true,
      vehicleClassId: true,
      vehicleClass: { select: { id: true, className: true } },
      reservations: {
        where: {
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          pickupDate: { lt: endDate },
          returnDate: { gt: startDate },
        },
        orderBy: { pickupDate: "asc" },
        select: {
          id: true,
          reservationCode: true,
          status: true,
          customerName: true,
          customerPhone: true,
          pickupDate: true,
          returnDate: true,
          estimatedAmount: true,
          pickupOffice: { select: { officeName: true } },
          returnOffice: { select: { officeName: true } },
        },
      },
    },
  });

  const data = {
    vehicles: vehicles.map((v) => ({
      id: v.id,
      vehicleCode: v.vehicleCode,
      maker: v.maker,
      modelName: v.modelName,
      plateNumber: v.plateNumber,
      vehicleClassName: v.vehicleClass?.className ?? "",
      vehicleClassId: v.vehicleClassId ?? "",
      reservations: v.reservations.map((r) => ({
        id: r.id,
        reservationCode: r.reservationCode,
        status: r.status,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        pickupDate: r.pickupDate.toISOString(),
        returnDate: r.returnDate.toISOString(),
        pickupOfficeName: r.pickupOffice.officeName,
        returnOfficeName: r.returnOffice.officeName,
        estimatedAmount: r.estimatedAmount,
      })),
    })),
  };

  return apiSuccess(data);
});
