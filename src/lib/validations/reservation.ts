/**
 * 予約（Reservation）バリデーションスキーマ
 *
 * Zod v4 で入力を検証。
 * pickupDate < returnDate のリファインメントを含む。
 */

import { z } from "zod/v4";

export const createReservationSchema = z
  .object({
    vehicleClassId: z.string().min(1, "車両クラスを選択してください"),
    vehicleId: z.string().nullish(),
    customerName: z.string().min(1, "顧客名を入力してください"),
    customerNameKana: z.string().min(1, "顧客名（カナ）を入力してください"),
    customerPhone: z.string().min(1, "電話番号を入力してください"),
    customerEmail: z
      .string()
      .email("有効なメールアドレスを入力してください")
      .nullish()
      .or(z.literal("")),
    pickupDate: z.coerce.date({ error: "出発日時を入力してください" }),
    returnDate: z.coerce.date({ error: "帰着予定日時を入力してください" }),
    pickupOfficeId: z.string().min(1, "出発営業所を選択してください"),
    returnOfficeId: z.string().min(1, "帰着営業所を選択してください"),
    estimatedAmount: z.coerce.number().int().nonnegative().nullish(),
    note: z.string().nullish(),
    customerCode: z.string().optional(),
    entityType: z.number().int().min(1).max(2).optional(),
    companyCode: z.string().optional(),
    channel: z.string().optional(),
    accountId: z.string().optional(),
  })
  .refine((data) => data.pickupDate < data.returnDate, {
    message: "帰着予定日時は出発日時より後にしてください",
    path: ["returnDate"],
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const updateReservationSchema = createReservationSchema;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
