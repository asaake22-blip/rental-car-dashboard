"use server";

/**
 * 車両クラス（VehicleClass）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { vehicleClassService } from "@/lib/services/vehicle-class-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 車両クラスを作成 */
export async function createVehicleClass(formData: FormData): Promise<ActionResult> {
  try {
    const input = extractVehicleClassInput(formData);
    await vehicleClassService.create(input);
    revalidatePath("/vehicle-classes");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 車両クラスを更新 */
export async function updateVehicleClass(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const input = extractVehicleClassInput(formData);
    await vehicleClassService.update(id, input);
    revalidatePath("/vehicle-classes");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 車両クラスを削除 */
export async function deleteVehicleClass(id: string): Promise<ActionResult> {
  try {
    await vehicleClassService.delete(id);
    revalidatePath("/vehicle-classes");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** FormData -> サービス層入力への変換 */
function extractVehicleClassInput(formData: FormData) {
  return {
    className: formData.get("className") as string,
    description: (formData.get("description") as string) || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };
}
