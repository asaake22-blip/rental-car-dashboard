"use server";

/**
 * 請求書（Invoice）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { invoiceService } from "@/lib/services/invoice-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 請求書を作成 */
export async function createInvoice(input: unknown): Promise<ActionResult> {
  try {
    await invoiceService.create(input);
    revalidatePath("/invoices");
    revalidatePath("/reservations");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 請求書を更新 */
export async function updateInvoice(id: string, input: unknown): Promise<ActionResult> {
  try {
    await invoiceService.update(id, input);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 請求書を発行（DRAFT → ISSUED） */
export async function issueInvoice(id: string): Promise<ActionResult> {
  try {
    await invoiceService.issue(id);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 請求書の入金確認（ISSUED/OVERDUE → PAID） */
export async function markInvoicePaid(id: string, paidAt?: Date): Promise<ActionResult> {
  try {
    await invoiceService.markPaid(id, paidAt);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/payments");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 請求書をキャンセル（DRAFT/ISSUED → CANCELLED） */
export async function cancelInvoice(id: string): Promise<ActionResult> {
  try {
    await invoiceService.cancel(id);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}
