/**
 * リース契約（LeaseContract/LeaseContractLine）のバリデーションスキーマ
 *
 * contractNumber はサービス層で自動採番するため、スキーマには含めない。
 */

import { z } from "zod";

/** リース契約明細のスキーマ */
export const leaseContractLineSchema = z.object({
  vehicleId: z.string().min(1, "車両は必須です"),
  startDate: z.string().min(1, "開始日は必須です"),
  endDate: z.string().min(1, "終了日は必須です"),
  monthlyAmount: z
    .number()
    .int("月額は整数で入力してください")
    .min(0, "月額は0以上で入力してください"),
  note: z.string().nullish(),
});

/** リース契約の作成用スキーマ */
export const createLeaseContractSchema = z.object({
  externalId: z.string().nullish(),
  lesseeType: z.enum(["INDIVIDUAL", "CORPORATE"], {
    message: "個人または法人を選択してください",
  }),
  lesseeCompanyCode: z.string().nullish(),
  lesseeName: z.string().min(1, "リース先名称は必須です"),
  startDate: z.string().min(1, "開始日は必須です"),
  endDate: z.string().min(1, "終了日は必須です"),
  note: z.string().nullish(),
  lines: z
    .array(leaseContractLineSchema)
    .min(1, "最低1台の車両を指定してください"),
});

/** リース契約ヘッダーの更新用スキーマ（明細は含めない） */
export const updateLeaseContractSchema = z.object({
  externalId: z.string().nullish(),
  lesseeType: z.enum(["INDIVIDUAL", "CORPORATE"], {
    message: "個人または法人を選択してください",
  }),
  lesseeCompanyCode: z.string().nullish(),
  lesseeName: z.string().min(1, "リース先名称は必須です"),
  startDate: z.string().min(1, "開始日は必須です"),
  endDate: z.string().min(1, "終了日は必須です"),
  note: z.string().nullish(),
});

/** 明細追加用スキーマ */
export const addLineSchema = z.object({
  vehicleId: z.string().min(1, "車両は必須です"),
  startDate: z.string().min(1, "開始日は必須です"),
  endDate: z.string().min(1, "終了日は必須です"),
  monthlyAmount: z
    .number()
    .int("月額は整数で入力してください")
    .min(0, "月額は0以上で入力してください"),
  note: z.string().nullish(),
});

/** 明細更新用スキーマ（vehicleId は変更不可） */
export const updateLineSchema = z.object({
  startDate: z.string().min(1, "開始日は必須です"),
  endDate: z.string().min(1, "終了日は必須です"),
  monthlyAmount: z
    .number()
    .int("月額は整数で入力してください")
    .min(0, "月額は0以上で入力してください"),
  note: z.string().nullish(),
});

export type CreateLeaseContractInput = z.infer<
  typeof createLeaseContractSchema
>;
export type UpdateLeaseContractInput = z.infer<
  typeof updateLeaseContractSchema
>;
export type AddLineInput = z.infer<typeof addLineSchema>;
export type UpdateLineInput = z.infer<typeof updateLineSchema>;
export type LeaseContractLineInput = z.infer<typeof leaseContractLineSchema>;

/**
 * フォームフィールド定義（宣言的管理）
 * contractNumber は自動採番のためフォームには含めない
 */
export const leaseContractFormFields = [
  {
    name: "externalId",
    label: "外部ID",
    type: "text",
    required: false,
  },
  {
    name: "lesseeType",
    label: "リース先種別",
    type: "select",
    required: true,
    options: [
      { value: "INDIVIDUAL", label: "個人" },
      { value: "CORPORATE", label: "法人" },
    ],
  },
  {
    name: "lesseeCompanyCode",
    label: "会社コード",
    type: "text",
    required: false,
  },
  {
    name: "lesseeName",
    label: "リース先名称",
    type: "text",
    required: true,
  },
  {
    name: "startDate",
    label: "契約開始日",
    type: "date",
    required: true,
  },
  {
    name: "endDate",
    label: "契約終了日",
    type: "date",
    required: true,
  },
  { name: "note", label: "備考", type: "text", required: false },
] as const;
