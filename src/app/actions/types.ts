/**
 * Server Actions 用の共通戻り値型
 *
 * Server Actions は try-catch でサービス層のエラーを捕捉し、
 * この型で統一的にフロントエンドへレスポンスを返す。
 */

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
