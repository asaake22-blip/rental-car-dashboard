/**
 * 入金 API -- 一覧取得 + 作成
 *
 * GET  /api/payments?page=1&limit=50&status=UNALLOCATED&paymentCategory=BANK_TRANSFER&terminalId=xxx&search=xxx  一覧（ページネーション）
 * POST /api/payments                                                                                               作成（サービス層経由）
 */

import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { parsePaginationParams } from "@/lib/api/types";
import { paymentService } from "@/lib/services/payment-service";
import { searchConfigs, buildSearchWhere } from "@/lib/data-table/search-configs";

/** GET /api/payments -- 一覧取得 */
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
    const paymentCategory = searchParams.get("paymentCategory");
    if (paymentCategory) {
      where.paymentCategory = paymentCategory;
    }
    const terminalId = searchParams.get("terminalId");
    if (terminalId) {
      where.terminalId = terminalId;
    }
    const search = searchParams.get("search");
    if (search) {
      const searchWhere = buildSearchWhere(
        search,
        searchConfigs.payment.searchableColumns,
      );
      if (searchWhere) {
        Object.assign(where, searchWhere);
      }
    }

    const { data, total } = await paymentService.list({
      where,
      orderBy: { paymentNumber: "desc" },
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

/** POST /api/payments -- 作成 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const payment = await paymentService.create(body);
    return apiSuccess(payment, 201);
  } catch (e) {
    return handleApiError(e);
  }
});
