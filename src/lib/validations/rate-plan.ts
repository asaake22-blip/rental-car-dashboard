/**
 * 料金プラン（RatePlan）バリデーションスキーマ
 */

import { z } from "zod/v4";

export const createRatePlanSchema = z
  .object({
    vehicleClassId: z.string().min(1, "車両クラスを選択してください"),
    planName: z.string().min(1, "プラン名を入力してください"),
    rateType: z.enum(["HOURLY", "DAILY", "OVERNIGHT"], {
      error: "料金タイプを選択してください",
    }),
    basePrice: z.coerce.number().int().nonnegative("基本料金は0以上にしてください"),
    additionalHourPrice: z.coerce.number().int().nonnegative().default(0),
    insurancePrice: z.coerce.number().int().nonnegative().default(0),
    validFrom: z.coerce.date({ error: "有効開始日を入力してください" }),
    validTo: z.coerce.date().nullish(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => !data.validTo || data.validFrom < data.validTo,
    { message: "有効終了日は開始日より後にしてください", path: ["validTo"] },
  );

export type CreateRatePlanInput = z.infer<typeof createRatePlanSchema>;
export const updateRatePlanSchema = createRatePlanSchema;
export type UpdateRatePlanInput = z.infer<typeof updateRatePlanSchema>;
