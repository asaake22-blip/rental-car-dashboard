import type { PaginationParams } from "./types";

const DEFAULT_PAGE_SIZE = 100;
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

/**
 * searchParams から PaginationParams を安全にパースする
 * prefix を指定すると ot_page, st_page のようにプレフィックス付きパラメータを読み取る
 */
export function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  options?: {
    prefix?: string;
    defaultSortBy?: string;
    defaultSortOrder?: "asc" | "desc";
  }
): PaginationParams {
  const p = options?.prefix ? `${options.prefix}_` : "";

  const rawPage = searchParams[`${p}page`];
  const rawPageSize = searchParams[`${p}pageSize`];
  const rawSearch = searchParams[`${p}search`];
  const rawSortBy = searchParams[`${p}sortBy`];
  const rawSortOrder = searchParams[`${p}sortOrder`];

  const page = Math.max(1, parseInt(String(rawPage ?? "1"), 10) || 1);
  const pageSizeRaw = parseInt(String(rawPageSize ?? String(DEFAULT_PAGE_SIZE)), 10);
  const pageSize = ALLOWED_PAGE_SIZES.includes(pageSizeRaw) ? pageSizeRaw : DEFAULT_PAGE_SIZE;
  const search = typeof rawSearch === "string" ? rawSearch.trim() : "";
  const sortBy = typeof rawSortBy === "string" ? rawSortBy : (options?.defaultSortBy ?? "");
  const sortOrder =
    rawSortOrder === "asc" || rawSortOrder === "desc"
      ? rawSortOrder
      : (options?.defaultSortOrder ?? "desc");

  return { page, pageSize, search, sortBy, sortOrder };
}
