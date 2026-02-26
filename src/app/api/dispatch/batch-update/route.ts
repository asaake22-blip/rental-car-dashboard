/**
 * 配車表（ガントチャート）一括日時更新 API
 *
 * POST /api/dispatch/batch-update
 * Body: { changes: [{ reservationId, pickupDate, returnDate }] }
 */

import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { withAuth } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, _ctx) => {
  const body = await req.json();
  const changes = body.changes as Array<{
    reservationId: string;
    pickupDate: string;
    returnDate: string;
  }>;

  if (!Array.isArray(changes) || changes.length === 0) {
    return apiError("変更データが必要です", 400);
  }

  // 各予約のバリデーション + 更新を実行
  const updates = changes.map((c) => {
    const pickup = new Date(c.pickupDate);
    const returnD = new Date(c.returnDate);

    if (pickup >= returnD) {
      throw new Error(
        `予約 ${c.reservationId}: 帰着日時は出発日時より後にしてください`,
      );
    }

    return prisma.reservation.update({
      where: { id: c.reservationId },
      data: {
        pickupDate: pickup,
        returnDate: returnD,
      },
    });
  });

  try {
    const results = await prisma.$transaction(updates);
    return apiSuccess({ updated: results.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "更新に失敗しました";
    return apiError(msg, 400);
  }
});
