/**
 * 車両クラス API -- 詳細取得 + 更新 + 削除
 *
 * GET    /api/vehicle-classes/:id  詳細
 * PUT    /api/vehicle-classes/:id  更新（サービス層経由）
 * DELETE /api/vehicle-classes/:id  削除（サービス層経由）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { vehicleClassService } from "@/lib/services/vehicle-class-service";

/** GET /api/vehicle-classes/:id -- 詳細取得 */
export const GET = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const vehicleClass = await vehicleClassService.get(id);
  if (!vehicleClass) {
    return apiError("車両クラスが見つかりません", 404);
  }
  return apiSuccess(vehicleClass);
});

/** PUT /api/vehicle-classes/:id -- 更新 */
export const PUT = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  try {
    const body = await req.json();
    const vehicleClass = await vehicleClassService.update(id, body);
    return apiSuccess(vehicleClass);
  } catch (e) {
    return handleApiError(e);
  }
});

/** DELETE /api/vehicle-classes/:id -- 削除 */
export const DELETE = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  try {
    await vehicleClassService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
});
