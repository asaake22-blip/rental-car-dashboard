/**
 * REST API エラーハンドラー
 *
 * サービス層のカスタムエラーを適切な HTTP ステータスコードに変換する。
 */

import { ValidationError, NotFoundError, PermissionError } from "@/lib/errors";
import { apiError } from "./response";

/**
 * サービス層のエラーを HTTP レスポンスに変換
 *
 * - ValidationError → 400 Bad Request（fieldErrors 付き）
 * - NotFoundError → 404 Not Found
 * - PermissionError → 403 Forbidden
 * - その他 → 500 Internal Server Error
 */
export function handleApiError(e: unknown): Response {
  if (e instanceof ValidationError) {
    return apiError(e.message, 400, e.fieldErrors);
  }
  if (e instanceof NotFoundError) {
    return apiError(e.message, 404);
  }
  if (e instanceof PermissionError) {
    return apiError(e.message, 403);
  }

  console.error("API 内部エラー:", e);
  return apiError("予期しないエラーが発生しました", 500);
}
