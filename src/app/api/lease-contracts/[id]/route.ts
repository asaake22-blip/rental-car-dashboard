/**
 * リース契約 API -- 詳細・更新・削除
 *
 * GET    /api/lease-contracts/:id  詳細取得
 * PUT    /api/lease-contracts/:id  ヘッダー更新
 * DELETE /api/lease-contracts/:id  削除
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { leaseContractService } from "@/lib/services/lease-contract-service";

/** URL パスから契約 ID を取得: /api/lease-contracts/:id */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/lease-contracts/:id -> segments[3]
  return segments[segments.length - 1]!;
}

/** GET /api/lease-contracts/:id -- 詳細取得 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const contract = await leaseContractService.get(id);
    if (!contract) {
      return apiError("契約が見つかりません", 404);
    }
    return apiSuccess(contract);
  } catch (e) {
    return handleApiError(e);
  }
});

/** PUT /api/lease-contracts/:id -- ヘッダー更新 */
export const PUT = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    const body = await req.json();
    const contract = await leaseContractService.update(id, body);
    return apiSuccess(contract);
  } catch (e) {
    return handleApiError(e);
  }
});

/** DELETE /api/lease-contracts/:id -- 削除 */
export const DELETE = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    await leaseContractService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
});
