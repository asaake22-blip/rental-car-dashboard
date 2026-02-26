/**
 * 営業所（Office）のバリデーションスキーマ
 *
 * CRUD ダイアログ・サービス層・Server Actions で共通利用。
 * スキーマ変更時はここを修正すれば型・バリデーション・フォームが連動する。
 */

import { z } from "zod";

/** 営業所の作成用スキーマ */
export const createOfficeSchema = z.object({
  officeName: z.string().min(1, "営業所名は必須です"),
  area: z.string().nullish(),
});

/** 営業所の更新用スキーマ（作成と同一） */
export const updateOfficeSchema = createOfficeSchema;

export type CreateOfficeInput = z.infer<typeof createOfficeSchema>;

/**
 * フォームフィールド定義（宣言的管理）
 *
 * CRUD ダイアログのフォームフィールドを配列で定義。
 * カラム追加・削除時はこの配列を変更するだけで対応可能。
 */
export const officeFormFields = [
  { name: "officeName", label: "営業所名", type: "text", required: true },
  { name: "area", label: "エリア", type: "text", required: false },
] as const;
