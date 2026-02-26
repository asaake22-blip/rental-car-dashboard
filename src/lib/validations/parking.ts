/**
 * 駐車場（ParkingLot / ParkingSpot）のバリデーションスキーマ
 *
 * CRUD ダイアログ・サービス層・Server Actions で共通利用。
 */

import { z } from "zod";

/** 駐車場の作成用スキーマ */
export const createParkingLotSchema = z.object({
  officeId: z.string().min(1, "事業所は必須です"),
  name: z.string().min(1, "駐車場名は必須です"),
  canvasWidth: z.number().int("キャンバス幅は整数で入力してください").min(1, "キャンバス幅は1以上で入力してください").default(800),
  canvasHeight: z.number().int("キャンバス高さは整数で入力してください").min(1, "キャンバス高さは1以上で入力してください").default(600),
});

/** 駐車場の更新用スキーマ（作成と同一） */
export const updateParkingLotSchema = createParkingLotSchema;

export type CreateParkingLotInput = z.infer<typeof createParkingLotSchema>;

/** 駐車スペース JSON 一括インポート用スキーマ */
export const spotsJsonImportSchema = z.object({
  spots: z.array(
    z.object({
      number: z.string().min(1, "スポット番号は必須です"),
      x: z.number({ error: "X座標は数値で入力してください" }),
      y: z.number({ error: "Y座標は数値で入力してください" }),
      width: z.number({ error: "幅は数値で入力してください" }).min(0, "幅は0以上で入力してください"),
      height: z.number({ error: "高さは数値で入力してください" }).min(0, "高さは0以上で入力してください"),
      rotation: z.number({ error: "回転角度は数値で入力してください" }).default(0),
    }),
  ).min(1, "スポットを1つ以上指定してください"),
});

export type SpotsJsonImportInput = z.infer<typeof spotsJsonImportSchema>;

/**
 * フォームフィールド定義（宣言的管理）
 */
export const parkingLotFormFields = [
  { name: "officeId", label: "事業所", type: "text", required: true },
  { name: "name", label: "駐車場名", type: "text", required: true },
  { name: "canvasWidth", label: "キャンバス幅", type: "number", required: false },
  { name: "canvasHeight", label: "キャンバス高さ", type: "number", required: false },
] as const;

/** アノテーション種別 */
const annotationTypes = ["boundary", "road", "building", "entrance", "exit", "label", "line"] as const;
const strokeDashTypes = ["solid", "dashed", "dotted"] as const;
const directionTypes = ["north", "south", "east", "west"] as const;

/** 単一アノテーションのスキーマ */
export const annotationSchema = z.object({
  id: z.string().min(1),
  type: z.enum(annotationTypes),
  x: z.number(),
  y: z.number(),
  width: z.number().min(0),
  height: z.number().min(0),
  rotation: z.number().default(0),
  label: z.string().optional(),
  strokeColor: z.string().default("#6b7280"),
  fillColor: z.string().default("transparent"),
  strokeWidth: z.number().min(0).default(2),
  strokeDash: z.enum(strokeDashTypes).default("solid"),
  fontSize: z.number().optional(),
  direction: z.enum(directionTypes).optional(),
  zIndex: z.number().default(0),
});

/** アノテーション配列の保存用スキーマ */
export const annotationsPayloadSchema = z.object({
  annotations: z.array(annotationSchema),
});

export type AnnotationInput = z.infer<typeof annotationSchema>;
export type AnnotationsPayloadInput = z.infer<typeof annotationsPayloadSchema>;
