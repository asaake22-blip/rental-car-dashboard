/**
 * 車両クラス API -- 一覧取得 + 作成
 *
 * GET  /api/vehicle-classes?page=1&limit=50  一覧（ページネーション）
 * POST /api/vehicle-classes                   作成（サービス層経由）
 */

import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { parsePaginationParams } from "@/lib/api/types";
import { vehicleClassService } from "@/lib/services/vehicle-class-service";

/** GET /api/vehicle-classes -- 一覧取得 */
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = parsePaginationParams(searchParams);

  const { data, total } = await vehicleClassService.list({
    orderBy: { sortOrder: "asc" },
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

/** POST /api/vehicle-classes -- 作成 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const vehicleClass = await vehicleClassService.create(body);
    return apiSuccess(vehicleClass, 201);
  } catch (e) {
    return handleApiError(e);
  }
});
