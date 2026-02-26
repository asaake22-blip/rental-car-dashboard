/**
 * 入金 API -- 詳細・更新・削除
 *
 * GET    /api/payments/:id  詳細取得
 * PUT    /api/payments/:id  ヘッダー更新
 * DELETE /api/payments/:id  削除
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { paymentService } from "@/lib/services/payment-service";

/** URL パスから入金 ID を取得: /api/payments/:id */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  return segments[segments.length - 1]!;
}

/** GET /api/payments/:id -- 詳細取得 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const payment = await paymentService.get(id);
    return apiSuccess(payment);
  } catch (e) {
    return handleApiError(e);
  }
});

/** PUT /api/payments/:id -- ヘッダー更新 */
export const PUT = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    const body = await req.json();
    const payment = await paymentService.update(id, body);
    return apiSuccess(payment);
  } catch (e) {
    return handleApiError(e);
  }
});

/** DELETE /api/payments/:id -- 削除 */
export const DELETE = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    await paymentService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
});
