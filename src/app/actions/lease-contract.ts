"use server";

/**
 * リース契約（LeaseContract）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { leaseContractService } from "@/lib/services/lease-contract-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 契約作成 */
export async function createLeaseContract(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = extractContractInput(formData);
    await leaseContractService.create(input);
    revalidatePath("/lease-contracts");
    revalidatePath("/vehicles");
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

/** 契約ヘッダー更新 */
export async function updateLeaseContract(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = extractHeaderInput(formData);
    await leaseContractService.update(id, input);
    revalidatePath("/lease-contracts");
    revalidatePath(`/lease-contracts/${id}`);
    revalidatePath("/vehicles");
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

/** 契約削除 */
export async function deleteLeaseContract(id: string): Promise<ActionResult> {
  try {
    await leaseContractService.delete(id);
    revalidatePath("/lease-contracts");
    revalidatePath("/vehicles");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "予期しないエラー",
    };
  }
}

/** 契約解約 */
export async function terminateLeaseContract(
  id: string,
): Promise<ActionResult> {
  try {
    await leaseContractService.terminate(id);
    revalidatePath("/lease-contracts");
    revalidatePath(`/lease-contracts/${id}`);
    revalidatePath("/vehicles");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "予期しないエラー",
    };
  }
}

/** 明細追加 */
export async function addContractLine(
  contractId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = extractLineInput(formData);
    await leaseContractService.addLine(contractId, input);
    revalidatePath("/lease-contracts");
    revalidatePath(`/lease-contracts/${contractId}`);
    revalidatePath("/vehicles");
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

/** 明細更新 */
export async function updateContractLine(
  lineId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = extractLineUpdateInput(formData);
    const line = await leaseContractService.updateLine(lineId, input);
    revalidatePath("/lease-contracts");
    revalidatePath(`/lease-contracts/${line.contractId}`);
    revalidatePath("/vehicles");
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

/** 明細削除 */
export async function removeContractLine(lineId: string): Promise<ActionResult> {
  try {
    await leaseContractService.removeLine(lineId);
    revalidatePath("/lease-contracts");
    revalidatePath("/vehicles");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "予期しないエラー",
    };
  }
}

/** FormData → 契約作成入力（ヘッダー + 明細）への変換 */
function extractContractInput(formData: FormData) {
  const lineCount = Number(formData.get("lineCount")) || 0;
  const lines: Array<{
    vehicleId: string;
    startDate: string;
    endDate: string;
    monthlyAmount: number;
    note: string | null;
  }> = [];

  for (let i = 0; i < lineCount; i++) {
    lines.push({
      vehicleId: formData.get(`lines[${i}].vehicleId`) as string,
      startDate: formData.get(`lines[${i}].startDate`) as string,
      endDate: formData.get(`lines[${i}].endDate`) as string,
      monthlyAmount: Number(formData.get(`lines[${i}].monthlyAmount`)) || 0,
      note: (formData.get(`lines[${i}].note`) as string) || null,
    });
  }

  return {
    externalId: (formData.get("externalId") as string) || null,
    lesseeType: formData.get("lesseeType") as string,
    lesseeCompanyCode: (formData.get("lesseeCompanyCode") as string) || null,
    lesseeName: formData.get("lesseeName") as string,
    startDate: formData.get("startDate") as string,
    endDate: formData.get("endDate") as string,
    note: (formData.get("note") as string) || null,
    lines,
  };
}

/** FormData → ヘッダー更新入力への変換 */
function extractHeaderInput(formData: FormData) {
  return {
    externalId: (formData.get("externalId") as string) || null,
    lesseeType: formData.get("lesseeType") as string,
    lesseeCompanyCode: (formData.get("lesseeCompanyCode") as string) || null,
    lesseeName: formData.get("lesseeName") as string,
    startDate: formData.get("startDate") as string,
    endDate: formData.get("endDate") as string,
    note: (formData.get("note") as string) || null,
  };
}

/** FormData → 明細入力への変換 */
function extractLineInput(formData: FormData) {
  return {
    vehicleId: formData.get("vehicleId") as string,
    startDate: formData.get("startDate") as string,
    endDate: formData.get("endDate") as string,
    monthlyAmount: Number(formData.get("monthlyAmount")) || 0,
    note: (formData.get("note") as string) || null,
  };
}

/** FormData → 明細更新入力への変換（vehicleId なし） */
function extractLineUpdateInput(formData: FormData) {
  return {
    startDate: formData.get("startDate") as string,
    endDate: formData.get("endDate") as string,
    monthlyAmount: Number(formData.get("monthlyAmount")) || 0,
    note: (formData.get("note") as string) || null,
  };
}
