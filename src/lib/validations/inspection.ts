/**
 * 点検・整備記録（VehicleInspection）のバリデーションスキーマ
 *
 * CRUD ダイアログ・サービス層・Server Actions で共通利用。
 */

import { z } from "zod";

/** 点検記録の作成用スキーマ */
export const createInspectionSchema = z.object({
  vehicleId: z.string().min(1, "車両は必須です"),
  inspectionType: z.enum(["REGULAR", "LEGAL", "SHAKEN", "MAINTENANCE"], {
    error: "点検種別は必須です",
  }),
  scheduledDate: z.string().min(1, "予定日は必須です"),
  completedDate: z.string().nullish(),
  isCompleted: z.boolean().default(false),
  note: z.string().nullish(),
});

/** 点検記録の更新用スキーマ（作成と同一） */
export const updateInspectionSchema = createInspectionSchema;

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;

/**
 * フォームフィールド定義（宣言的管理）
 */
export const inspectionFormFields = [
  { name: "vehicleId", label: "車両", type: "text", required: true },
  { name: "inspectionType", label: "点検種別", type: "select", required: true, options: [
    { value: "REGULAR", label: "定期点検" },
    { value: "LEGAL", label: "法令点検" },
    { value: "SHAKEN", label: "車検" },
    { value: "MAINTENANCE", label: "整備" },
  ] },
  { name: "scheduledDate", label: "予定日", type: "date", required: true },
  { name: "completedDate", label: "実施日", type: "date", required: false },
  { name: "note", label: "備考", type: "text", required: false },
] as const;
