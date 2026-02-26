/**
 * 請求書 API -- 一覧取得 + 作成
 *
 * GET  /api/invoices?page=1&limit=50&status=DRAFT  一覧（ページネーション）
 * POST /api/invoices                                作成（サービス層経由）
 */

import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { parsePaginationParams } from "@/lib/api/types";
import { invoiceService } from "@/lib/services/invoice-service";

/** GET /api/invoices -- 一覧取得 */
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
    const reservationId = searchParams.get("reservationId");
    if (reservationId) {
      where.reservationId = reservationId;
    }

    const { data, total } = await invoiceService.list({
      where,
      orderBy: { createdAt: "desc" },
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

/** POST /api/invoices -- 作成 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const invoice = await invoiceService.create(body);
    return apiSuccess(invoice, 201);
  } catch (e) {
    return handleApiError(e);
  }
});
