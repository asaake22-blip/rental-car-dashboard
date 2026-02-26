/**
 * 見積書（Quotation）バリデーションスキーマ
 *
 * Zod v4 で入力を検証。
 * CRUD ダイアログ・サービス層・Server Actions で共通利用。
 */

import { z } from "zod/v4";

/** 見積書明細行スキーマ */
const quotationLineSchema = z.object({
  description: z.string().min(1, "品名を入力してください"),
  quantity: z.number().positive("数量は1以上で入力してください").default(1),
  unitPrice: z.number().int().min(0, "単価は0以上で入力してください"),
  taxRate: z.number().min(0).max(1).default(0.10),
});

/** 見積書の作成用スキーマ */
export const createQuotationSchema = z.object({
  accountId: z.string().min(1, "取引先を選択してください"),
  title: z.string().optional(),
  customerName: z.string().min(1, "宛名を入力してください"),
  vehicleClassId: z.string().optional(),
  pickupDate: z.coerce.date().optional(),
  returnDate: z.coerce.date().optional(),
  pickupOfficeId: z.string().optional(),
  returnOfficeId: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  note: z.string().optional(),
  lines: z.array(quotationLineSchema).min(1, "明細行を最低1行入力してください"),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

/** 見積書の更新用スキーマ（accountId 以外すべて任意） */
export const updateQuotationSchema = createQuotationSchema
  .partial()
  .omit({ accountId: true });

export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;

/**
 * フォームフィールド定義（宣言的管理）
 *
 * CRUD ダイアログのフォームフィールドを配列で定義。
 * カラム追加・削除時はこの配列を変更するだけで対応可能。
 */
export const quotationFormFields = [
  { name: "accountId", label: "取引先", type: "text", required: true },
  { name: "title", label: "タイトル", type: "text", required: false },
  { name: "customerName", label: "宛名", type: "text", required: true },
  { name: "vehicleClassId", label: "車両クラス", type: "text", required: false },
  { name: "pickupDate", label: "出発予定日", type: "date", required: false },
  { name: "returnDate", label: "帰着予定日", type: "date", required: false },
  { name: "pickupOfficeId", label: "出発営業所", type: "text", required: false },
  { name: "returnOfficeId", label: "帰着営業所", type: "text", required: false },
  { name: "validUntil", label: "有効期限", type: "date", required: false },
  { name: "note", label: "備考", type: "text", required: false },
] as const;
