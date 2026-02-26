"use server";

/**
 * 見積書（Quotation）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { quotationService } from "@/lib/services/quotation-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 見積書を作成 */
export async function createQuotation(input: unknown): Promise<ActionResult> {
  try {
    await quotationService.create(input);
    revalidatePath("/quotations");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 見積書を更新 */
export async function updateQuotation(id: string, input: unknown): Promise<ActionResult> {
  try {
    await quotationService.update(id, input);
    revalidatePath("/quotations");
    revalidatePath(`/quotations/${id}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 見積書を削除 */
export async function deleteQuotation(id: string): Promise<ActionResult> {
  try {
    await quotationService.delete(id);
    revalidatePath("/quotations");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 見積書を送付（DRAFT -> SENT） */
export async function sendQuotation(id: string): Promise<ActionResult> {
  try {
    await quotationService.send(id);
    revalidatePath("/quotations");
    revalidatePath(`/quotations/${id}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 見積書を承諾（SENT -> ACCEPTED） */
export async function acceptQuotation(id: string): Promise<ActionResult> {
  try {
    await quotationService.accept(id);
    revalidatePath("/quotations");
    revalidatePath(`/quotations/${id}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 見積書を不成立（SENT -> REJECTED） */
export async function rejectQuotation(id: string): Promise<ActionResult> {
  try {
    await quotationService.reject(id);
    revalidatePath("/quotations");
    revalidatePath(`/quotations/${id}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 見積書を予約に変換（ACCEPTED -> Reservation作成） */
export async function convertQuotationToReservation(id: string): Promise<ActionResult> {
  try {
    await quotationService.convertToReservation(id);
    revalidatePath("/quotations");
    revalidatePath(`/quotations/${id}`);
    revalidatePath("/reservations");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}
