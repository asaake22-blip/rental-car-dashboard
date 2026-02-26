import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ratePlanService } from "@/lib/services/rate-plan-service";

function extractId(req: NextRequest): string {
  return new URL(req.url).pathname.split("/").pop()!;
}

export const GET = withAuth(async (req: NextRequest) => {
  const id = extractId(req);
  const ratePlan = await ratePlanService.get(id);
  if (!ratePlan) return apiError("料金プランが見つかりません", 404);
  return apiSuccess(ratePlan);
});

export const PUT = withAuth(async (req: NextRequest) => {
  const id = extractId(req);
  try {
    const body = await req.json();
    const ratePlan = await ratePlanService.update(id, body);
    return apiSuccess(ratePlan);
  } catch (e) {
    return handleApiError(e);
  }
});

export const DELETE = withAuth(async (req: NextRequest) => {
  const id = extractId(req);
  try {
    await ratePlanService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
});
