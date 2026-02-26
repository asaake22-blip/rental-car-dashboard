/**
 * 承認操作のバリデーションスキーマ
 *
 * 予約の個別承認・一括承認で使用。
 */

import { z } from "zod";

/** 個別承認/却下 */
export const approvalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().optional(),
});

export type ApprovalInput = z.infer<typeof approvalSchema>;

/** 一括承認/却下（Reservation 固定） */
export const bulkApprovalSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "対象を1件以上選択してください"),
  status: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().optional(),
});

export type BulkApprovalInput = z.infer<typeof bulkApprovalSchema>;
