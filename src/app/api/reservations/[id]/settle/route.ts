/**
 * 予約 精算 API
 *
 * POST /api/reservations/:id/settle  精算処理（RETURNED → SETTLED）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { reservationService } from "@/lib/services/reservation-service";

/** URL パスから予約 ID を取得: /api/reservations/:id/settle */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/reservations/:id/settle -> segments[-2]
  return segments[segments.length - 2]!;
}

/** POST /api/reservations/:id/settle -- 精算処理 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const body = await req.json();

    if (body.actualAmount == null || typeof body.actualAmount !== "number") {
      return apiError("actualAmount は必須です（数値）", 400);
    }
    if (body.actualAmount < 0) {
      return apiError("actualAmount は0以上である必要があります", 400);
    }

    const reservation = await reservationService.settle(id, {
      actualAmount: body.actualAmount,
      paymentCategory: body.paymentCategory ?? undefined,
      note: body.note ?? null,
    });
    return apiSuccess(reservation);
  } catch (e) {
    return handleApiError(e);
  }
});
