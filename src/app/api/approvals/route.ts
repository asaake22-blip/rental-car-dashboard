/**
 * 承認 API -- 個別承認/却下
 *
 * POST /api/approvals  個別承認/却下
 *   Body: { id: string, status: "APPROVED"|"REJECTED", comment?: string }
 *
 * 承認対象は Reservation のみ（Order/Sale は廃止済み）。
 */

import { withAuth } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { approvalService } from "@/lib/services/approval-service";

/** POST /api/approvals -- 個別承認/却下 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { id, status, comment } = body;

    if (!id) {
      return Response.json(
        { success: false, error: "id は必須です" },
        { status: 400 },
      );
    }

    if (status !== "APPROVED" && status !== "REJECTED") {
      return Response.json(
        {
          success: false,
          error: "status は APPROVED または REJECTED を指定してください",
        },
        { status: 400 },
      );
    }

    const reservation = await approvalService.approve(id, { status, comment });
    return apiSuccess(reservation);
  } catch (e) {
    return handleApiError(e);
  }
});
