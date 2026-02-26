/**
 * カスタムエラークラス
 *
 * サービス層で業務エラーを throw する際に使用。
 * Server Actions が try-catch で捕捉し、フロントエンド向けのレスポンスに変換する。
 */

/** バリデーションエラー（Zod の safeParse 失敗、業務バリデーション違反） */
export class ValidationError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

/** 対象データが見つからない */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** 権限不足 */
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}
