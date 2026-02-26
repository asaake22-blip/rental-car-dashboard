/**
 * 予約 キャンセル API
 *
 * POST /api/reservations/:id/cancel  予約をキャンセル（RESERVED/CONFIRMED → CANCELLED）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { reservationService } from "@/lib/services/reservation-service";

/** URL パスから予約 ID を取得: /api/reservations/:id/cancel */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/reservations/:id/cancel -> segments[-2]
  return segments[segments.length - 2]!;
}

/** POST /api/reservations/:id/cancel -- キャンセル */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const reservation = await reservationService.cancel(id);
    return apiSuccess(reservation);
  } catch (e) {
    return handleApiError(e);
  }
});
