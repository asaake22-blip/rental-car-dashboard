/**
 * Basic 認証 Middleware
 *
 * 環境変数 BASIC_AUTH_USER / BASIC_AUTH_PASSWORD が設定されている場合のみ有効。
 * 未設定時はスキップ（ローカル開発に影響なし）。
 * /api/ パスは除外（Bearer トークン認証と競合を避けるため）。
 *
 * 認証成功時に __session Cookie を設定し、ブラウザの fetch() から
 * /api/ パスへのリクエストでも認証状態を維持する。
 */

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  // ポートフォリオとして公開する場合は、BASIC_AUTH_USER/PASSWORD を設定しないことで認証をスキップする
  // 本番環境で使用する場合は、必ず環境変数を設定すること
  if (!user || !password) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [reqUser, reqPass] = decoded.split(":");
      if (reqUser === user && reqPass === password) {
        const response = NextResponse.next();
        // セッション Cookie を設定（/api/ への fetch 用）
        response.cookies.set("__session", "authenticated", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 24 * 60 * 60, // 60日
        });
        return response;
      }
    }
  }

  return new NextResponse("認証が必要です", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Rental Car Dashboard"',
    },
  });
}

export const config = {
  matcher: [
    // /api/ パスは除外（Bearer トークン認証を使用）
    // _next/static, _next/image, favicon.ico も除外
    "/((?!api/|_next/static|_next/image|favicon.ico).*)",
  ],
};
