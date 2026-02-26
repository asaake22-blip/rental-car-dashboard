/**
 * 予約 API -- 詳細取得 + 更新 + 削除（キャンセル）
 *
 * GET    /api/reservations/:id  詳細
 * PUT    /api/reservations/:id  更新（サービス層経由）
 * DELETE /api/reservations/:id  キャンセル（サービス層経由）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { reservationService } from "@/lib/services/reservation-service";

/** URL パスから予約 ID を取得 */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  return url.pathname.split("/").pop()!;
}

/** GET /api/reservations/:id -- 詳細取得 */
export const GET = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  const reservation = await reservationService.get(id);
  if (!reservation) {
    return apiError("予約が見つかりません", 404);
  }
  return apiSuccess(reservation);
});

/** PUT /api/reservations/:id -- 更新 */
export const PUT = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    const body = await req.json();
    const reservation = await reservationService.update(id, body);
    return apiSuccess(reservation);
  } catch (e) {
    return handleApiError(e);
  }
});

/** DELETE /api/reservations/:id -- キャンセル */
export const DELETE = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    const reservation = await reservationService.cancel(id);
    return apiSuccess(reservation);
  } catch (e) {
    return handleApiError(e);
  }
});
