/**
 * 予約 帰着（返却）API
 *
 * POST /api/reservations/:id/return  帰着処理（DEPARTED → RETURNED）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { reservationService } from "@/lib/services/reservation-service";

/** URL パスから予約 ID を取得: /api/reservations/:id/return */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/reservations/:id/return -> segments[-2]
  return segments[segments.length - 2]!;
}

/** POST /api/reservations/:id/return -- 帰着処理 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const body = await req.json();

    if (!body.actualReturnDate || typeof body.actualReturnDate !== "string") {
      return apiError("actualReturnDate は必須です", 400);
    }
    if (body.returnOdometer == null || typeof body.returnOdometer !== "number") {
      return apiError("returnOdometer は必須です（数値）", 400);
    }

    const reservation = await reservationService.return(id, {
      actualReturnDate: new Date(body.actualReturnDate),
      returnOdometer: body.returnOdometer,
      fuelLevelAtReturn: body.fuelLevelAtReturn ?? null,
    });
    return apiSuccess(reservation);
  } catch (e) {
    return handleApiError(e);
  }
});
