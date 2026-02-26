/**
 * REST API 認証
 *
 * 以下の3方式をサポート:
 * 1. Bearer トークン認証（外部 API クライアント向け）
 *    Authorization: Bearer <API_KEY>
 * 2. Basic 認証フォールバック（ブラウザ内 fetch 向け）
 *    ブラウザがページ表示時の Basic 認証情報を送信した場合に受け入れる。
 * 3. セッション Cookie フォールバック（middleware Basic 認証経由）
 *    middleware で Basic 認証成功時に設定される __session Cookie で認証。
 *    ブラウザの fetch() が Basic 認証ヘッダーを /api/ に送信しない場合の対策。
 */

import type { NextRequest } from "next/server";
import type { ApiContext } from "./types";
import { apiError } from "./response";

/**
 * Basic 認証ヘッダーを検証する。
 * middleware と同じ環境変数を参照し、一致すれば true を返す。
 */
function authenticateBasic(authHeader: string): boolean {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return false;

  const [scheme, encoded] = authHeader.split(" ");
  if (scheme !== "Basic" || !encoded) return false;

  const decoded = atob(encoded);
  const [reqUser, reqPass] = decoded.split(":");
  return reqUser === user && reqPass === password;
}

/**
 * セッション Cookie を検証する。
 * middleware が Basic 認証成功時に設定した __session Cookie を確認する。
 */
function authenticateSession(req: NextRequest): boolean {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return false;

  const sessionCookie = req.cookies.get("__session");
  return sessionCookie?.value === "authenticated";
}

/**
 * リクエストの認証情報を検証し、認証コンテキストを返す。
 * Bearer トークン → Basic 認証 → セッション Cookie の順にフォールバックする。
 * 認証失敗時は null を返す。
 */
export function authenticateApiRequest(req: NextRequest): ApiContext | null {
  const authHeader = req.headers.get("authorization");

  // ポートフォリオ環境では API_KEY を設定しないことで認証をスキップする
  // 本番環境で使用する場合は、必ず API_KEY を環境変数で設定すること
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      // 本番環境では Basic/Cookie 認証をフォールバックとして許可
      if (authHeader && authenticateBasic(authHeader)) {
        return { userId: "browser-user", apiKey: "" };
      }
      if (authenticateSession(req)) {
        return { userId: "browser-user", apiKey: "" };
      }
      return null;
    }
    // 開発・ポートフォリオ環境では認証スキップ
    return { userId: "api-user", apiKey: "" };
  }

  if (authHeader) {
    // 1. Bearer トークン認証（外部 API クライアント）
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (token === apiKey) {
        return { userId: "api-user", apiKey: token };
      }
      return null;
    }

    // 2. Basic 認証フォールバック（ブラウザ内 fetch）
    if (authenticateBasic(authHeader)) {
      return { userId: "browser-user", apiKey: "" };
    }
  }

  // 3. セッション Cookie フォールバック（middleware Basic 認証経由）
  if (authenticateSession(req)) {
    return { userId: "browser-user", apiKey: "" };
  }

  return null;
}

/**
 * 認証付きハンドラーラッパー（Higher-Order Function）
 *
 * API Route のハンドラーをラップし、認証チェックを自動で行う。
 * 認証失敗時は 401 レスポンスを返す。
 */
export function withAuth(
  handler: (req: NextRequest, ctx: ApiContext) => Promise<Response>,
) {
  return async (req: NextRequest): Promise<Response> => {
    const ctx = authenticateApiRequest(req);
    if (!ctx) {
      return apiError("認証が必要です", 401);
    }
    return handler(req, ctx);
  };
}
