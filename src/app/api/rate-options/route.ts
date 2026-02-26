import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { rateOptionService } from "@/lib/services/rate-option-service";
import { parsePaginationParams } from "@/lib/api/types";

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const params = parsePaginationParams(searchParams);
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;

  const { data, total } = await rateOptionService.list({ where, skip: params.skip, take: params.limit });
  return apiPaginated(data, { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) });
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const rateOption = await rateOptionService.create(body);
    return apiSuccess(rateOption, 201);
  } catch (e) {
    return handleApiError(e);
  }
});
