/**
 * 請求書 API -- 詳細取得 + 更新 + キャンセル
 *
 * GET    /api/invoices/:id  詳細取得
 * PUT    /api/invoices/:id  更新（DRAFT のみ）
 * DELETE /api/invoices/:id  キャンセル（DRAFT/ISSUED のみ）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { invoiceService } from "@/lib/services/invoice-service";

/** URL パスから請求書 ID を取得: /api/invoices/:id */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  return segments[segments.length - 1]!;
}

/** GET /api/invoices/:id -- 詳細取得 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const invoice = await invoiceService.get(id);
    if (!invoice) {
      return apiError("請求書が見つかりません", 404);
    }
    return apiSuccess(invoice);
  } catch (e) {
    return handleApiError(e);
  }
});

/** PUT /api/invoices/:id -- 更新 */
export const PUT = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    const body = await req.json();
    const invoice = await invoiceService.update(id, body);
    return apiSuccess(invoice);
  } catch (e) {
    return handleApiError(e);
  }
});

/** DELETE /api/invoices/:id -- キャンセル */
export const DELETE = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    const invoice = await invoiceService.cancel(id);
    return apiSuccess(invoice);
  } catch (e) {
    return handleApiError(e);
  }
});
