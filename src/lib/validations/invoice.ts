/**
 * 請求書（Invoice）バリデーションスキーマ
 *
 * Zod v4 で入力を検証。
 * CRUD ダイアログ・サービス層・Server Actions で共通利用。
 */

import { z } from "zod/v4";

/** 請求書明細行スキーマ */
const invoiceLineSchema = z.object({
  description: z.string().min(1, "品名を入力してください"),
  quantity: z.number().positive("数量は1以上で入力してください").default(1),
  unitPrice: z.number().int().min(0, "単価は0以上で入力してください"),
  taxRate: z.number().min(0).max(1).default(0.10),
});

/** 請求書の作成用スキーマ */
export const createInvoiceSchema = z.object({
  reservationId: z.string().min(1, "予約を選択してください"),
  customerName: z.string().min(1, "顧客名を入力してください"),
  customerCode: z.string().optional(),
  companyCode: z.string().optional(),
  accountId: z.string().optional(),
  issueDate: z.coerce.date({ error: "発行日を入力してください" }),
  dueDate: z.coerce.date({ error: "支払期日を入力してください" }),
  amount: z.number().int().min(0, "請求金額は0以上で入力してください"),
  taxAmount: z.number().int().min(0, "消費税額は0以上で入力してください"),
  totalAmount: z.number().int().min(0, "合計金額は0以上で入力してください"),
  note: z.string().optional(),
  lines: z.array(invoiceLineSchema).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/** 請求書の更新用スキーマ（全フィールド任意） */
export const updateInvoiceSchema = createInvoiceSchema.partial();

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

/**
 * フォームフィールド定義（宣言的管理）
 *
 * CRUD ダイアログのフォームフィールドを配列で定義。
 * カラム追加・削除時はこの配列を変更するだけで対応可能。
 */
export const invoiceFormFields = [
  { name: "reservationId", label: "予約", type: "text", required: true },
  { name: "customerName", label: "顧客名", type: "text", required: true },
  { name: "customerCode", label: "顧客コード", type: "text", required: false },
  { name: "companyCode", label: "法人コード", type: "text", required: false },
  { name: "issueDate", label: "発行日", type: "date", required: true },
  { name: "dueDate", label: "支払期日", type: "date", required: true },
  { name: "amount", label: "請求金額（税抜）", type: "number", required: true },
  { name: "taxAmount", label: "消費税額", type: "number", required: true },
  { name: "totalAmount", label: "合計金額（税込）", type: "number", required: true },
  { name: "note", label: "備考", type: "text", required: false },
] as const;
