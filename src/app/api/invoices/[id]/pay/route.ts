/**
 * 請求書入金確認 API
 *
 * POST /api/invoices/:id/pay  入金確認処理（ISSUED/OVERDUE → PAID）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { invoiceService } from "@/lib/services/invoice-service";

/** URL パスから請求書 ID を取得: /api/invoices/:id/pay */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/invoices/:id/pay -> segments[-2] が :id
  return segments[segments.length - 2]!;
}

/** POST /api/invoices/:id/pay -- 入金確認処理 */
export const POST = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    const body = await req.json().catch(() => ({}));
    const paidAt = body.paidAt ? new Date(body.paidAt) : undefined;
    const invoice = await invoiceService.markPaid(id, paidAt);
    return apiSuccess(invoice);
  } catch (e) {
    return handleApiError(e);
  }
});
