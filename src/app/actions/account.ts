"use server";

/**
 * 取引先（Account）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { accountService } from "@/lib/services/account-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 取引先を作成 */
export async function createAccount(formData: FormData): Promise<ActionResult> {
  try {
    const input = extractAccountInput(formData);
    await accountService.create(input);
    revalidatePath("/accounts");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 取引先を更新 */
export async function updateAccount(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const input = extractAccountInput(formData);
    await accountService.update(id, input);
    revalidatePath("/accounts");
    revalidatePath(`/accounts/${id}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 取引先を削除 */
export async function deleteAccount(id: string): Promise<ActionResult> {
  try {
    await accountService.delete(id);
    revalidatePath("/accounts");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** FormData -> サービス層入力への変換 */
function extractAccountInput(formData: FormData) {
  const closingDayStr = formData.get("closingDay") as string;
  const paymentMonthOffsetStr = formData.get("paymentMonthOffset") as string;
  const paymentDayStr = formData.get("paymentDay") as string;

  return {
    accountName: formData.get("accountName") as string,
    accountNameKana: (formData.get("accountNameKana") as string) || null,
    accountType: formData.get("accountType") as string,
    closingDay: closingDayStr ? Number(closingDayStr) : null,
    paymentMonthOffset: paymentMonthOffsetStr ? Number(paymentMonthOffsetStr) : null,
    paymentDay: paymentDayStr ? Number(paymentDayStr) : null,
    paymentTermsLabel: (formData.get("paymentTermsLabel") as string) || null,
    zipCode: (formData.get("zipCode") as string) || null,
    address: (formData.get("address") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    mfPartnerId: (formData.get("mfPartnerId") as string) || null,
    mfPartnerCode: (formData.get("mfPartnerCode") as string) || null,
    legacyCompanyCode: (formData.get("legacyCompanyCode") as string) || null,
  };
}
