/**
 * 料金オプション（RateOption）バリデーションスキーマ
 */

import { z } from "zod/v4";

export const createRateOptionSchema = z.object({
  optionName: z.string().min(1, "オプション名を入力してください"),
  price: z.coerce.number().int().nonnegative("料金は0以上にしてください"),
  isActive: z.boolean().default(true),
});

export type CreateRateOptionInput = z.infer<typeof createRateOptionSchema>;
export const updateRateOptionSchema = createRateOptionSchema;
export type UpdateRateOptionInput = z.infer<typeof updateRateOptionSchema>;
