"use server";

/**
 * 点検・整備記録（VehicleInspection）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { inspectionService } from "@/lib/services/inspection-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 点検記録を作成 */
export async function createInspection(formData: FormData): Promise<ActionResult> {
  try {
    const input = extractInspectionInput(formData);
    const inspection = await inspectionService.create(input);
    revalidatePath("/inspections");
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${inspection.vehicleId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 点検記録を更新 */
export async function updateInspection(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const input = extractInspectionInput(formData);
    const inspection = await inspectionService.update(id, input);
    revalidatePath("/inspections");
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${inspection.vehicleId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 点検を完了にする */
export async function completeInspection(id: string): Promise<ActionResult> {
  try {
    const inspection = await inspectionService.complete(id);
    revalidatePath("/inspections");
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${inspection.vehicleId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 点検記録を削除 */
export async function deleteInspection(id: string): Promise<ActionResult> {
  try {
    await inspectionService.delete(id);
    revalidatePath("/inspections");
    revalidatePath("/vehicles");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** FormData → サービス層入力への変換 */
function extractInspectionInput(formData: FormData) {
  return {
    vehicleId: formData.get("vehicleId") as string,
    inspectionType: formData.get("inspectionType") as string,
    scheduledDate: formData.get("scheduledDate") as string,
    completedDate: (formData.get("completedDate") as string) || null,
    isCompleted: formData.get("isCompleted") === "true",
    note: (formData.get("note") as string) || null,
  };
}
