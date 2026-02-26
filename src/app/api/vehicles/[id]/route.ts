/**
 * 車両 API — 詳細取得 + 更新 + 削除
 *
 * GET    /api/vehicles/:id  詳細
 * PUT    /api/vehicles/:id  更新（サービス層経由）
 * DELETE /api/vehicles/:id  削除（サービス層経由）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { vehicleService } from "@/lib/services/vehicle-service";

/** GET /api/vehicles/:id — 詳細取得 */
export const GET = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const vehicle = await vehicleService.get(id);
  if (!vehicle) {
    return apiError("車両データが見つかりません", 404);
  }
  return apiSuccess(vehicle);
});

/** PUT /api/vehicles/:id — 更新 */
export const PUT = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  try {
    const body = await req.json();
    const vehicle = await vehicleService.update(id, body);
    return apiSuccess(vehicle);
  } catch (e) {
    return handleApiError(e);
  }
});

/** DELETE /api/vehicles/:id — 削除 */
export const DELETE = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  try {
    await vehicleService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
});
