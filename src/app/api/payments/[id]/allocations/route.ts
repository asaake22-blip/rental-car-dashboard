/**
 * 入金消込 API -- 消込追加・一括消込・消込更新
 *
 * POST /api/payments/:id/allocations          消込追加（単一 or 一括）
 * PUT  /api/payments/:id/allocations          消込更新（allocationId をボディで指定）
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { paymentService } from "@/lib/services/payment-service";

/** URL パスから入金 ID を取得: /api/payments/:id/allocations */
function extractPaymentId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // /api/payments/:id/allocations -> segments[-2] が :id
  return segments[segments.length - 2]!;
}

/**
 * POST /api/payments/:id/allocations -- 消込追加
 *
 * リクエストボディ:
 * - 単一: { reservationId, allocatedAmount, invoiceId?, note? }
 * - 一括: { allocations: [{ reservationId, allocatedAmount, invoiceId?, note? }] }
 */
export const POST = withAuth(async (req: NextRequest) => {
  const paymentId = extractPaymentId(req);

  try {
    const body = await req.json();

    // 一括消込かどうかを判定
    if (body.allocations && Array.isArray(body.allocations)) {
      const allocations = await paymentService.bulkAllocate(
        paymentId,
        body,
      );
      return apiSuccess(allocations, 201);
    }

    // 単一消込
    const allocation = await paymentService.addAllocation(
      paymentId,
      body,
    );
    return apiSuccess(allocation, 201);
  } catch (e) {
    return handleApiError(e);
  }
});

/**
 * PUT /api/payments/:id/allocations -- 消込更新
 *
 * リクエストボディ: { allocationId, reservationId, allocatedAmount, invoiceId?, note? }
 */
export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { allocationId, ...input } = body;

    if (!allocationId) {
      return Response.json(
        {
          success: false,
          error: "allocationId は必須です",
        },
        { status: 400 },
      );
    }

    const allocation = await paymentService.updateAllocation(
      allocationId,
      input,
    );
    return apiSuccess(allocation);
  } catch (e) {
    return handleApiError(e);
  }
});
