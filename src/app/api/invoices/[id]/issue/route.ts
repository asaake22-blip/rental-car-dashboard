/**
 * 請求書発行 API
 *
 * POST /api/invoices/:id/issue  発行処理（DRAFT → ISSUED）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { invoiceService } from "@/lib/services/invoice-service";

/** URL パスから請求書 ID を取得: /api/invoices/:id/issue */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/invoices/:id/issue -> segments[-2] が :id
  return segments[segments.length - 2]!;
}

/** POST /api/invoices/:id/issue -- 発行処理 */
export const POST = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    const invoice = await invoiceService.issue(id);
    return apiSuccess(invoice);
  } catch (e) {
    return handleApiError(e);
  }
});
