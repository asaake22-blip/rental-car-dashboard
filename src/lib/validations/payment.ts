/**
 * 入金管理（Payment / PaymentAllocation / PaymentTerminal）のバリデーションスキーマ
 *
 * paymentNumber / terminalCode はサービス層で自動採番するため、スキーマには含めない。
 */

import { z } from "zod";

// ── Payment ──────────────────────────────────────────────

/** 消込明細のスキーマ（入金作成時の同時指定用） */
export const allocationInputSchema = z.object({
  reservationId: z.string().min(1, "予約は必須です"),
  invoiceId: z.string().optional(),
  allocatedAmount: z
    .number()
    .int("消込金額は整数で入力してください")
    .min(1, "消込金額は1以上で入力してください"),
});

/** 入金の作成用スキーマ */
export const createPaymentSchema = z.object({
  paymentDate: z.string().min(1, "入金日は必須です"),
  amount: z
    .number()
    .int("金額は整数で入力してください")
    .min(1, "金額は1以上で入力してください"),
  paymentCategory: z.enum(
    [
      "BANK_TRANSFER",
      "CASH",
      "CREDIT_CARD",
      "ELECTRONIC_MONEY",
      "QR_PAYMENT",
      "CHECK",
      "OTHER",
    ],
    { message: "入金カテゴリを選択してください" },
  ),
  paymentProvider: z.string().nullish(),
  payerName: z.string().min(1, "入金元名称は必須です"),
  terminalId: z.string().nullish(),
  externalId: z.string().nullish(),
  note: z.string().nullish(),
  allocations: z.array(allocationInputSchema).nullish(),
});

/** 入金ヘッダーの更新用スキーマ（消込は含めない） */
export const updatePaymentSchema = z.object({
  paymentDate: z.string().min(1, "入金日は必須です"),
  amount: z
    .number()
    .int("金額は整数で入力してください")
    .min(1, "金額は1以上で入力してください"),
  paymentCategory: z.enum(
    [
      "BANK_TRANSFER",
      "CASH",
      "CREDIT_CARD",
      "ELECTRONIC_MONEY",
      "QR_PAYMENT",
      "CHECK",
      "OTHER",
    ],
    { message: "入金カテゴリを選択してください" },
  ),
  paymentProvider: z.string().nullish(),
  payerName: z.string().min(1, "入金元名称は必須です"),
  terminalId: z.string().nullish(),
  externalId: z.string().nullish(),
  note: z.string().nullish(),
});

/** 消込追加用スキーマ */
export const addAllocationSchema = z.object({
  reservationId: z.string().min(1, "予約は必須です"),
  invoiceId: z.string().optional(),
  allocatedAmount: z
    .number()
    .int("消込金額は整数で入力してください")
    .min(1, "消込金額は1以上で入力してください"),
});

/** 一括消込用スキーマ */
export const bulkAllocateSchema = z.object({
  allocations: z
    .array(allocationInputSchema)
    .min(1, "最低1件の消込を指定してください"),
});

// ── Terminal ─────────────────────────────────────────────

/** 決済端末の作成用スキーマ */
export const createTerminalSchema = z.object({
  terminalName: z.string().min(1, "端末名は必須です"),
  terminalType: z.enum(
    ["CREDIT_CARD", "ELECTRONIC_MONEY", "QR_PAYMENT", "MULTI"],
    { message: "端末種別を選択してください" },
  ),
  provider: z.string().nullish(),
  modelName: z.string().nullish(),
  serialNumber: z.string().nullish(),
  officeId: z.string().min(1, "営業所は必須です"),
  note: z.string().nullish(),
});

/** 決済端末の更新用スキーマ */
export const updateTerminalSchema = z.object({
  terminalName: z.string().min(1, "端末名は必須です"),
  terminalType: z.enum(
    ["CREDIT_CARD", "ELECTRONIC_MONEY", "QR_PAYMENT", "MULTI"],
    { message: "端末種別を選択してください" },
  ),
  provider: z.string().nullish(),
  modelName: z.string().nullish(),
  serialNumber: z.string().nullish(),
  officeId: z.string().min(1, "営業所は必須です"),
  status: z
    .enum(["ACTIVE", "INACTIVE", "MAINTENANCE"], {
      message: "ステータスを選択してください",
    })
    .optional(),
  note: z.string().nullish(),
});

// ── 型 export ────────────────────────────────────────────

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type AddAllocationInput = z.infer<typeof addAllocationSchema>;
export type BulkAllocateInput = z.infer<typeof bulkAllocateSchema>;
export type AllocationInput = z.infer<typeof allocationInputSchema>;
export type CreateTerminalInput = z.infer<typeof createTerminalSchema>;
export type UpdateTerminalInput = z.infer<typeof updateTerminalSchema>;

// ── フォームフィールド定義 ────────────────────────────────

export const paymentFormFields = [
  {
    name: "paymentDate",
    label: "入金日",
    type: "date",
    required: true,
  },
  {
    name: "amount",
    label: "金額",
    type: "number",
    required: true,
  },
  {
    name: "paymentCategory",
    label: "入金カテゴリ",
    type: "select",
    required: true,
    options: [
      { value: "BANK_TRANSFER", label: "銀行振込" },
      { value: "CASH", label: "現金" },
      { value: "CREDIT_CARD", label: "クレジットカード" },
      { value: "ELECTRONIC_MONEY", label: "電子マネー" },
      { value: "QR_PAYMENT", label: "QR決済" },
      { value: "CHECK", label: "小切手" },
      { value: "OTHER", label: "その他" },
    ],
  },
  {
    name: "paymentProvider",
    label: "決済プロバイダ",
    type: "text",
    required: false,
  },
  {
    name: "payerName",
    label: "入金元名称",
    type: "text",
    required: true,
  },
  {
    name: "terminalId",
    label: "決済端末",
    type: "select",
    required: false,
  },
  {
    name: "externalId",
    label: "外部ID",
    type: "text",
    required: false,
  },
  { name: "note", label: "備考", type: "text", required: false },
] as const;

export const terminalFormFields = [
  {
    name: "terminalName",
    label: "端末名",
    type: "text",
    required: true,
  },
  {
    name: "terminalType",
    label: "端末種別",
    type: "select",
    required: true,
    options: [
      { value: "CREDIT_CARD", label: "クレジットカード端末" },
      { value: "ELECTRONIC_MONEY", label: "電子マネー端末" },
      { value: "QR_PAYMENT", label: "QRコード端末" },
      { value: "MULTI", label: "マルチ決済端末" },
    ],
  },
  {
    name: "provider",
    label: "決済代行会社",
    type: "text",
    required: false,
  },
  {
    name: "modelName",
    label: "機種名",
    type: "text",
    required: false,
  },
  {
    name: "serialNumber",
    label: "シリアル番号",
    type: "text",
    required: false,
  },
  {
    name: "officeId",
    label: "営業所",
    type: "select",
    required: true,
  },
  { name: "note", label: "備考", type: "text", required: false },
] as const;
