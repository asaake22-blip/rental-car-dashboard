/**
 * REST API レスポンスヘルパー
 *
 * 全エンドポイントで統一的なレスポンス形式を返すためのユーティリティ。
 */

import type { PaginationMeta } from "./types";

/** 成功レスポンス */
export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

/** エラーレスポンス */
export function apiError(
  error: string,
  status = 400,
  fieldErrors?: Record<string, string[]>,
): Response {
  const body: { success: false; error: string; fieldErrors?: Record<string, string[]> } = {
    success: false,
    error,
  };
  if (fieldErrors) body.fieldErrors = fieldErrors;
  return Response.json(body, { status });
}

/** ページネーション付きレスポンス */
export function apiPaginated<T>(data: T[], pagination: PaginationMeta): Response {
  return Response.json({ success: true, data, pagination }, { status: 200 });
}
