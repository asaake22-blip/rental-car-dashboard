/**
 * 車両データ（Vehicle）のバリデーションスキーマ
 *
 * CRUD ダイアログ・サービス層・Server Actions で共通利用。
 * スキーマ変更時はここを修正すれば型・バリデーション・フォームが連動する。
 */

import { z } from "zod";

/** 車両データの作成用スキーマ */
export const createVehicleSchema = z.object({
  plateNumber: z.string().nullish(),
  vin: z.string().nullish(),
  maker: z.string().min(1, "メーカーは必須です"),
  modelName: z.string().min(1, "車種名は必須です"),
  year: z.number().int("年式は整数で入力してください"),
  color: z.string().nullish(),
  mileage: z.number().int("走行距離は整数で入力してください").min(0, "走行距離は0以上で入力してください").default(0),
  status: z.enum(["IN_STOCK", "LEASED", "RENTED", "MAINTENANCE", "RETIRED"]).optional(),
  officeId: z.string().min(1, "事業所は必須です"),
  vehicleClassId: z.string().nullish(),
});

/** 車両データの更新用スキーマ（作成と同一） */
export const updateVehicleSchema = createVehicleSchema;

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

/**
 * フォームフィールド定義（宣言的管理）
 *
 * CRUD ダイアログのフォームフィールドを配列で定義。
 * カラム追加・削除時はこの配列を変更するだけで対応可能。
 */
export const vehicleFormFields = [
  { name: "plateNumber", label: "ナンバープレート", type: "text", required: false },
  { name: "vin", label: "車台番号", type: "text", required: false },
  { name: "maker", label: "メーカー", type: "text", required: true },
  { name: "modelName", label: "車種名", type: "text", required: true },
  { name: "year", label: "年式", type: "number", required: true },
  { name: "color", label: "色", type: "text", required: false },
  { name: "mileage", label: "走行距離", type: "number", required: true },
  { name: "officeId", label: "事業所", type: "text", required: true },
  { name: "vehicleClassId", label: "車両クラス", type: "text", required: false },
  { name: "status", label: "ステータス", type: "select", required: false, options: [
    { value: "IN_STOCK", label: "在庫" },
    { value: "LEASED", label: "リース中" },
    { value: "RENTED", label: "貸出中" },
    { value: "MAINTENANCE", label: "整備中" },
    { value: "RETIRED", label: "退役" },
  ] },
] as const;
