/**
 * リース契約 API -- 一覧取得 + 作成
 *
 * GET  /api/lease-contracts?page=1&limit=50&status=ACTIVE&search=xxx  一覧（ページネーション）
 * POST /api/lease-contracts                                            作成（サービス層経由）
 */

import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { parsePaginationParams } from "@/lib/api/types";
import { leaseContractService } from "@/lib/services/lease-contract-service";
import { searchConfigs, buildSearchWhere } from "@/lib/data-table/search-configs";

/** GET /api/lease-contracts -- 一覧取得 */
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    // フィルタ条件
    const where: Record<string, unknown> = {};
    const status = searchParams.get("status");
    if (status) {
      where.status = status;
    }
    const search = searchParams.get("search");
    if (search) {
      const searchWhere = buildSearchWhere(
        search,
        searchConfigs.leaseContract.searchableColumns,
      );
      if (searchWhere) {
        Object.assign(where, searchWhere);
      }
    }

    const { data, total } = await leaseContractService.list({
      where,
      orderBy: { contractNumber: "desc" },
      skip,
      take: limit,
    });

    return apiPaginated(data, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    return handleApiError(e);
  }
});

/** POST /api/lease-contracts -- 作成 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const contract = await leaseContractService.create(body);
    return apiSuccess(contract, 201);
  } catch (e) {
    return handleApiError(e);
  }
});
