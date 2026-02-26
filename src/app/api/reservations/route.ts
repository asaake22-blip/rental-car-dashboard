/**
 * 予約 API -- 一覧取得 + 作成
 *
 * GET  /api/reservations?page=1&limit=50&status=RESERVED&vehicleClassId=xxx&pickupOfficeId=xxx&search=xxx
 * POST /api/reservations
 */

import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { parsePaginationParams } from "@/lib/api/types";
import { reservationService } from "@/lib/services/reservation-service";
import type { Prisma } from "@/generated/prisma/client";

/** GET /api/reservations -- 一覧取得 */
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = parsePaginationParams(searchParams);

  // フィルタ構築
  const where: Prisma.ReservationWhereInput = {};

  const status = searchParams.get("status");
  if (status) {
    where.status = status as Prisma.ReservationWhereInput["status"];
  }

  const vehicleClassId = searchParams.get("vehicleClassId");
  if (vehicleClassId) {
    where.vehicleClassId = vehicleClassId;
  }

  const pickupOfficeId = searchParams.get("pickupOfficeId");
  if (pickupOfficeId) {
    where.pickupOfficeId = pickupOfficeId;
  }

  const search = searchParams.get("search");
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: "insensitive" } },
      { customerNameKana: { contains: search, mode: "insensitive" } },
      { customerPhone: { contains: search } },
      { reservationCode: { contains: search, mode: "insensitive" } },
    ];
  }

  const { data, total } = await reservationService.list({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  return apiPaginated(data, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

/** POST /api/reservations -- 作成 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const reservation = await reservationService.create(body);
    return apiSuccess(reservation, 201);
  } catch (e) {
    return handleApiError(e);
  }
});
