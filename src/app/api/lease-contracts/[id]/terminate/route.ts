/**
 * リース契約 解約 API
 *
 * POST /api/lease-contracts/:id/terminate  契約を解約（TERMINATED）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { leaseContractService } from "@/lib/services/lease-contract-service";

/** URL パスから契約 ID を取得: /api/lease-contracts/:id/terminate */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/lease-contracts/:id/terminate -> segments[-2]
  return segments[segments.length - 2]!;
}

/** POST /api/lease-contracts/:id/terminate -- 解約 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const contract = await leaseContractService.terminate(id);
    return apiSuccess(contract);
  } catch (e) {
    return handleApiError(e);
  }
});
