/**
 * 車両クラス（VehicleClass）のバリデーションスキーマ
 *
 * CRUD ダイアログ・サービス層・Server Actions で共通利用。
 */

import { z } from "zod";

/** 車両クラスの作成用スキーマ */
export const createVehicleClassSchema = z.object({
  className: z.string().min(1, "クラス名は必須です"),
  description: z.string().nullish(),
  sortOrder: z.number().int("表示順は整数で入力してください").default(0),
});

/** 車両クラスの更新用スキーマ（作成と同一） */
export const updateVehicleClassSchema = createVehicleClassSchema;

export type CreateVehicleClassInput = z.infer<typeof createVehicleClassSchema>;
