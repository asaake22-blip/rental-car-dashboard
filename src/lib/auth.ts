/**
 * 認証スタブ
 *
 * 現時点ではダミーユーザーを返す。
 * 将来 Firebase Auth / NextAuth.js を導入する際に、
 * このファイルの関数を実装に差し替えるだけで認証が有効になる。
 */

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
};

/**
 * 現在のログインユーザーを取得する。
 * 認証未実装のため、ダミーの管理者ユーザーを返す。
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  return {
    id: "stub-user-001",
    email: "admin@example.com",
    name: "管理者（開発用）",
    role: "ADMIN",
  };
}

/**
 * ユーザーが特定のロール以上の権限を持っているかチェック。
 */
export function hasRole(
  user: CurrentUser,
  requiredRole: "ADMIN" | "MANAGER" | "MEMBER"
): boolean {
  const hierarchy = { ADMIN: 3, MANAGER: 2, MEMBER: 1 };
  return hierarchy[user.role] >= hierarchy[requiredRole];
}
