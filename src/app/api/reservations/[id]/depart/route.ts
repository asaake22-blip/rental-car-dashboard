/**
 * 予約 出発（貸渡）API
 *
 * POST /api/reservations/:id/depart  出発処理（CONFIRMED → DEPARTED）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { reservationService } from "@/lib/services/reservation-service";

/** URL パスから予約 ID を取得: /api/reservations/:id/depart */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/reservations/:id/depart -> segments[-2]
  return segments[segments.length - 2]!;
}

/** POST /api/reservations/:id/depart -- 出発処理 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const body = await req.json();

    if (!body.actualPickupDate || typeof body.actualPickupDate !== "string") {
      return apiError("actualPickupDate は必須です", 400);
    }
    if (body.departureOdometer == null || typeof body.departureOdometer !== "number") {
      return apiError("departureOdometer は必須です（数値）", 400);
    }

    const reservation = await reservationService.depart(id, {
      actualPickupDate: new Date(body.actualPickupDate),
      departureOdometer: body.departureOdometer,
    });
    return apiSuccess(reservation);
  } catch (e) {
    return handleApiError(e);
  }
});
