"use server";

/**
 * 入金管理（Payment / PaymentAllocation）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { paymentService } from "@/lib/services/payment-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 入金作成 */
export async function createPayment(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = extractPaymentInput(formData);
    await paymentService.create(input);
    revalidatePath("/payments");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "予期しないエラー",
    };
  }
}

/** 入金ヘッダー更新 */
export async function updatePayment(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = extractPaymentHeaderInput(formData);
    await paymentService.update(id, input);
    revalidatePath("/payments");
    revalidatePath(`/payments/${id}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "予期しないエラー",
    };
  }
}

/** 入金削除 */
export async function deletePayment(id: string): Promise<ActionResult> {
  try {
    await paymentService.delete(id);
    revalidatePath("/payments");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "予期しないエラー",
    };
  }
}

/** 消込追加 */
export async function addPaymentAllocation(
  paymentId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = extractAllocationInput(formData);
    await paymentService.addAllocation(paymentId, input);
    revalidatePath("/payments");
    revalidatePath(`/payments/${paymentId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "予期しないエラー",
    };
  }
}

/** 一括消込 */
export async function bulkAllocatePayment(
  paymentId: string,
  data: { reservationId: string; allocatedAmount: number; note?: string; invoiceId?: string }[],
): Promise<ActionResult> {
  try {
    await paymentService.bulkAllocate(paymentId, { allocations: data });
    revalidatePath("/payments");
    revalidatePath(`/payments/${paymentId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "予期しないエラー",
    };
  }
}

/** 消込更新 */
export async function updatePaymentAllocation(
  allocationId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = extractAllocationInput(formData);
    const allocation = await paymentService.updateAllocation(
      allocationId,
      input,
    );
    revalidatePath("/payments");
    revalidatePath(`/payments/${allocation.paymentId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "予期しないエラー",
    };
  }
}

/** 消込削除 */
export async function removePaymentAllocation(
  allocationId: string,
  paymentId: string,
): Promise<ActionResult> {
  try {
    await paymentService.removeAllocation(allocationId);
    revalidatePath("/payments");
    revalidatePath(`/payments/${paymentId}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "予期しないエラー",
    };
  }
}

/** 精算済み・未全額消込の予約一覧を取得（消込 Dialog 用） */
export async function getUnallocatedReservations() {
  return paymentService.getUnallocatedReservations();
}

// ── FormData 変換ヘルパー ────────────────────────────────

/** FormData → 入金作成入力（ヘッダー + allocations）への変換 */
function extractPaymentInput(formData: FormData) {
  const allocationCount = Number(formData.get("allocationCount")) || 0;
  const allocations: Array<{
    reservationId: string;
    allocatedAmount: number;
    note: string | null;
  }> = [];

  for (let i = 0; i < allocationCount; i++) {
    allocations.push({
      reservationId: formData.get(`allocations[${i}].reservationId`) as string,
      allocatedAmount:
        Number(formData.get(`allocations[${i}].allocatedAmount`)) || 0,
      note:
        (formData.get(`allocations[${i}].note`) as string) || null,
    });
  }

  return {
    paymentDate: formData.get("paymentDate") as string,
    amount: Number(formData.get("amount")) || 0,
    paymentCategory: formData.get("paymentCategory") as string,
    paymentProvider:
      (formData.get("paymentProvider") as string) || null,
    payerName: formData.get("payerName") as string,
    terminalId: (formData.get("terminalId") as string) || null,
    externalId: (formData.get("externalId") as string) || null,
    note: (formData.get("note") as string) || null,
    allocations: allocations.length > 0 ? allocations : undefined,
  };
}

/** FormData → 入金ヘッダー更新入力への変換 */
function extractPaymentHeaderInput(formData: FormData) {
  return {
    paymentDate: formData.get("paymentDate") as string,
    amount: Number(formData.get("amount")) || 0,
    paymentCategory: formData.get("paymentCategory") as string,
    paymentProvider:
      (formData.get("paymentProvider") as string) || null,
    payerName: formData.get("payerName") as string,
    terminalId: (formData.get("terminalId") as string) || null,
    externalId: (formData.get("externalId") as string) || null,
    note: (formData.get("note") as string) || null,
  };
}

/** FormData → 消込入力への変換 */
function extractAllocationInput(formData: FormData) {
  return {
    reservationId: formData.get("reservationId") as string,
    allocatedAmount: Number(formData.get("allocatedAmount")) || 0,
    note: (formData.get("note") as string) || null,
  };
}
