import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { withAuth } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, _ctx) => {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const date = dateStr ? new Date(dateStr) : new Date();

  // 対象日の 00:00 ~ 翌日 00:00
  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  // 出発予定: CONFIRMED で pickupDate が当日
  const departures = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
      pickupDate: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { pickupDate: "asc" },
    include: {
      vehicle: true,
      vehicleClass: true,
      pickupOffice: true,
      returnOffice: true,
    },
  });

  // 帰着予定: DEPARTED で returnDate が当日
  const returns = await prisma.reservation.findMany({
    where: {
      status: "DEPARTED",
      returnDate: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { returnDate: "asc" },
    include: {
      vehicle: true,
      vehicleClass: true,
      pickupOffice: true,
      returnOffice: true,
    },
  });

  return apiSuccess({ departures, returns, date: dayStart.toISOString() });
});
