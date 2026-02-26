/**
 * 車両 API — 一覧取得 + 作成
 *
 * GET  /api/vehicles?page=1&limit=50&status=IN_STOCK&officeId=xxx  一覧（ページネーション）
 * POST /api/vehicles                                                 作成（サービス層経由）
 */

import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { parsePaginationParams } from "@/lib/api/types";
import { vehicleService } from "@/lib/services/vehicle-service";

/** GET /api/vehicles — 一覧取得 */
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = parsePaginationParams(searchParams);

  // フィルタ条件
  const where: Record<string, unknown> = {};
  const status = searchParams.get("status");
  if (status) {
    where.status = status;
  }
  const officeId = searchParams.get("officeId");
  if (officeId) {
    where.officeId = officeId;
  }
  const vehicleClassId = searchParams.get("vehicleClassId");
  if (vehicleClassId) {
    where.vehicleClassId = vehicleClassId;
  }

  const { data, total } = await vehicleService.list({
    where,
    orderBy: { plateNumber: "asc" },
    skip,
    take: limit,
  });

  return apiPaginated(data, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

/** POST /api/vehicles — 作成 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const vehicle = await vehicleService.create(body);
    return apiSuccess(vehicle, 201);
  } catch (e) {
    return handleApiError(e);
  }
});
