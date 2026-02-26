/**
 * 決済端末 API -- 一覧取得 + 作成
 *
 * GET  /api/terminals?page=1&limit=50&officeId=xxx&terminalType=CREDIT_CARD&status=ACTIVE&search=xxx  一覧（ページネーション）
 * POST /api/terminals                                                                                   作成（サービス層経由）
 */

import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { parsePaginationParams } from "@/lib/api/types";
import { terminalService } from "@/lib/services/terminal-service";
import { searchConfigs, buildSearchWhere } from "@/lib/data-table/search-configs";

/** GET /api/terminals -- 一覧取得 */
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    // フィルタ条件
    const where: Record<string, unknown> = {};
    const officeId = searchParams.get("officeId");
    if (officeId) {
      where.officeId = officeId;
    }
    const terminalType = searchParams.get("terminalType");
    if (terminalType) {
      where.terminalType = terminalType;
    }
    const status = searchParams.get("status");
    if (status) {
      where.status = status;
    }
    const search = searchParams.get("search");
    if (search) {
      const searchWhere = buildSearchWhere(
        search,
        searchConfigs.terminal.searchableColumns,
      );
      if (searchWhere) {
        Object.assign(where, searchWhere);
      }
    }

    const { data, total } = await terminalService.list({
      where,
      orderBy: { terminalCode: "desc" },
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

/** POST /api/terminals -- 作成 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const terminal = await terminalService.create(body);
    return apiSuccess(terminal, 201);
  } catch (e) {
    return handleApiError(e);
  }
});
