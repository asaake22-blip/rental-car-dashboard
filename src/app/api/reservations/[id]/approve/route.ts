/**
 * 予約承認/却下 API
 *
 * POST /api/reservations/:id/approve  承認または却下
 *   Body: { status: "APPROVED" | "REJECTED", comment?: string }
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { reservationService } from "@/lib/services/reservation-service";

/** URL パスから予約 ID を取得: /api/reservations/:id/approve */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/reservations/:id/approve -> segments[-2] が :id
  return segments[segments.length - 2]!;
}

/** POST /api/reservations/:id/approve -- 承認/却下 */
export const POST = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    const body = await req.json();
    const { status, comment } = body;

    if (status !== "APPROVED" && status !== "REJECTED") {
      return Response.json(
        {
          success: false,
          error: "status は APPROVED または REJECTED を指定してください",
        },
        { status: 400 },
      );
    }

    let reservation;
    if (status === "APPROVED") {
      reservation = await reservationService.approve(id, { comment });
    } else {
      reservation = await reservationService.reject(id, { comment });
    }

    return apiSuccess(reservation);
  } catch (e) {
    return handleApiError(e);
  }
});
