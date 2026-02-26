/**
 * 一括承認 API
 *
 * POST /api/approvals/bulk  一括承認/却下
 *   Body: { ids: string[], status: "APPROVED"|"REJECTED", comment?: string }
 *
 * 承認対象は Reservation のみ（Order/Sale は廃止済み）。
 */

import { withAuth } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { approvalService } from "@/lib/services/approval-service";

/** POST /api/approvals/bulk -- 一括承認/却下 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const result = await approvalService.bulkApprove(body);
    return apiSuccess(result);
  } catch (e) {
    return handleApiError(e);
  }
});
