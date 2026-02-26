/**
 * 予約 車両割当 API
 *
 * POST /api/reservations/:id/assign  車両を割り当て（RESERVED → CONFIRMED）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { reservationService } from "@/lib/services/reservation-service";

/** URL パスから予約 ID を取得: /api/reservations/:id/assign */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/reservations/:id/assign -> segments[-2]
  return segments[segments.length - 2]!;
}

/** POST /api/reservations/:id/assign -- 車両割当 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const body = await req.json();

    if (!body.vehicleId || typeof body.vehicleId !== "string") {
      return apiError("vehicleId は必須です", 400);
    }

    const reservation = await reservationService.assignVehicle(
      id,
      body.vehicleId,
    );
    return apiSuccess(reservation);
  } catch (e) {
    return handleApiError(e);
  }
});
