/**
 * リース契約 明細 API
 *
 * POST /api/lease-contracts/:id/lines  明細追加（車両を契約に追加）
 * PUT  /api/lease-contracts/:id/lines  明細更新（月額・日付・備考の変更）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { leaseContractService } from "@/lib/services/lease-contract-service";

/** URL パスから契約 ID を取得: /api/lease-contracts/:id/lines */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/lease-contracts/:id/lines -> segments[-2]
  return segments[segments.length - 2]!;
}

/** POST /api/lease-contracts/:id/lines -- 明細追加 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const body = await req.json();
    const line = await leaseContractService.addLine(id, body);
    return apiSuccess(line, 201);
  } catch (e) {
    return handleApiError(e);
  }
});

/** PUT /api/lease-contracts/:id/lines -- 明細更新 */
export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { lineId, ...input } = body;
    if (!lineId) {
      return apiError("lineId は必須です", 400);
    }
    const line = await leaseContractService.updateLine(lineId, input);
    return apiSuccess(line);
  } catch (e) {
    return handleApiError(e);
  }
});
