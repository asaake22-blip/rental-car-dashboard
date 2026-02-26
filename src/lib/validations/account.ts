/**
 * 取引先（Account）バリデーションスキーマ
 *
 * Zod v4 で入力を検証。
 * CRUD ダイアログ・サービス層・Server Actions で共通利用。
 */

import { z } from "zod/v4";

/** 取引先の作成用スキーマ */
export const createAccountSchema = z.object({
  accountName: z.string().min(1, "取引先名を入力してください"),
  accountNameKana: z.string().optional(),
  accountType: z.enum(["CORPORATE", "INDIVIDUAL"], {
    error: "取引先区分を選択してください",
  }),
  closingDay: z.number().int().min(1, "締日は1以上で入力してください").max(31, "締日は31以下で入力してください").optional(),
  paymentMonthOffset: z.number().int().min(0, "支払月オフセットは0以上で入力してください").max(12, "支払月オフセットは12以下で入力してください").optional(),
  paymentDay: z.number().int().min(1, "支払日は1以上で入力してください").max(31, "支払日は31以下で入力してください").optional(),
  paymentTermsLabel: z.string().optional(),
  mfPartnerId: z.string().optional(),
  mfPartnerCode: z.string().optional(),
  zipCode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .optional()
    .or(z.literal("")),
  legacyCompanyCode: z.string().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/** 取引先の更新用スキーマ（全フィールド任意） */
export const updateAccountSchema = createAccountSchema.partial();

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

/**
 * フォームフィールド定義（宣言的管理）
 *
 * CRUD ダイアログのフォームフィールドを配列で定義。
 * カラム追加・削除時はこの配列を変更するだけで対応可能。
 */
export const accountFormFields = [
  { name: "accountName", label: "取引先名", type: "text", required: true },
  { name: "accountNameKana", label: "取引先名（カナ）", type: "text", required: false },
  { name: "accountType", label: "取引先区分", type: "select", required: true },
  { name: "closingDay", label: "締日", type: "number", required: false },
  { name: "paymentMonthOffset", label: "支払月オフセット", type: "number", required: false },
  { name: "paymentDay", label: "支払日", type: "number", required: false },
  { name: "paymentTermsLabel", label: "支払条件", type: "text", required: false },
  { name: "mfPartnerId", label: "MF取引先ID", type: "text", required: false },
  { name: "mfPartnerCode", label: "MF取引先コード", type: "text", required: false },
  { name: "zipCode", label: "郵便番号", type: "text", required: false },
  { name: "address", label: "住所", type: "text", required: false },
  { name: "phone", label: "電話番号", type: "text", required: false },
  { name: "email", label: "メールアドレス", type: "text", required: false },
  { name: "legacyCompanyCode", label: "旧法人コード", type: "text", required: false },
] as const;
