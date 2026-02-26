/**
 * REST API 共通型定義
 */

/** API 成功レスポンス */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

/** API エラーレスポンス */
export type ApiErrorResponse = {
  success: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
};

/** API ページネーション付きレスポンス */
export type ApiPaginatedResponse<T> = {
  success: true;
  data: T[];
  pagination: PaginationMeta;
};

/** ページネーションメタ情報 */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** ページネーションパラメータ（クエリパラメータから取得） */
export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
};

/** API 認証コンテキスト */
export type ApiContext = {
  userId: string;
  apiKey: string;
};

/**
 * URL クエリパラメータからページネーションパラメータを解析
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
