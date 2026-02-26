"use server";

/**
 * 承認操作の Server Actions
 *
 * 承認対象は Reservation のみ（Order/Sale は廃止済み）。
 * サービス層を try-catch で呼び出し、revalidatePath で関連ページの UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { approvalService } from "@/lib/services/approval-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 個別承認/却下 */
export async function approve(
  id: string,
  status: "APPROVED" | "REJECTED",
  comment?: string,
): Promise<ActionResult> {
  try {
    await approvalService.approve(id, { status, comment });
    revalidatePath("/reservations");
    revalidatePath("/approvals");
    revalidatePath(`/reservations/${id}`);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 一括承認/却下 */
export async function bulkApprove(
  ids: string[],
  status: "APPROVED" | "REJECTED",
  comment?: string,
): Promise<ActionResult<{ count: number }>> {
  try {
    const data = await approvalService.bulkApprove({ ids, status, comment });
    revalidatePath("/reservations");
    revalidatePath("/approvals");
    revalidatePath("/");
    return { success: true, data };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}
