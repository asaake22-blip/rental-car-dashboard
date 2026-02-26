/**
 * 駐車場 API — 駐車場詳細取得（スポット + 車両マップデータ）
 *
 * GET /api/parking/:lotId  駐車場詳細（スポット + 割り当て車両を含む）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parkingService } from "@/lib/services/parking-service";

/** GET /api/parking/:lotId — 駐車場詳細（マップデータ） */
export const GET = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url);
  const lotId = url.pathname.split("/").pop()!;

  const lot = await parkingService.getLot(lotId);
  if (!lot) {
    return apiError("駐車場が見つかりません", 404);
  }
  return apiSuccess(lot);
});
