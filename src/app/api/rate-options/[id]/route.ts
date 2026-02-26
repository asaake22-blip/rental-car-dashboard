import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { rateOptionService } from "@/lib/services/rate-option-service";

function extractId(req: NextRequest): string {
  return new URL(req.url).pathname.split("/").pop()!;
}

export const GET = withAuth(async (req: NextRequest) => {
  const id = extractId(req);
  const rateOption = await rateOptionService.get(id);
  if (!rateOption) return apiError("オプションが見つかりません", 404);
  return apiSuccess(rateOption);
});

export const PUT = withAuth(async (req: NextRequest) => {
  const id = extractId(req);
  try {
    const body = await req.json();
    const rateOption = await rateOptionService.update(id, body);
    return apiSuccess(rateOption);
  } catch (e) {
    return handleApiError(e);
  }
});

export const DELETE = withAuth(async (req: NextRequest) => {
  const id = extractId(req);
  try {
    await rateOptionService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
});
