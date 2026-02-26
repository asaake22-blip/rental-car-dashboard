/**
 * 決済端末 API -- 詳細・更新・削除
 *
 * GET    /api/terminals/:id  詳細取得
 * PUT    /api/terminals/:id  更新
 * DELETE /api/terminals/:id  削除
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { terminalService } from "@/lib/services/terminal-service";

/** URL パスから端末 ID を取得: /api/terminals/:id */
function extractId(req: NextRequest): string {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  return segments[segments.length - 1]!;
}

/** GET /api/terminals/:id -- 詳細取得 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const id = extractId(req);
    const terminal = await terminalService.get(id);
    return apiSuccess(terminal);
  } catch (e) {
    return handleApiError(e);
  }
});

/** PUT /api/terminals/:id -- 更新 */
export const PUT = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    const body = await req.json();
    const terminal = await terminalService.update(id, body);
    return apiSuccess(terminal);
  } catch (e) {
    return handleApiError(e);
  }
});

/** DELETE /api/terminals/:id -- 削除 */
export const DELETE = withAuth(async (req: NextRequest) => {
  const id = extractId(req);

  try {
    await terminalService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
});
