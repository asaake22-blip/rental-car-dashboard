"use server";

/**
 * 車両データ（Vehicle）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { vehicleService } from "@/lib/services/vehicle-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 車両データを作成 */
export async function createVehicle(formData: FormData): Promise<ActionResult> {
  try {
    const input = extractVehicleInput(formData);
    await vehicleService.create(input);
    revalidatePath("/vehicles");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 車両データを更新 */
export async function updateVehicle(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const input = extractVehicleInput(formData);
    await vehicleService.update(id, input);
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${id}`);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 車両データを削除 */
export async function deleteVehicle(id: string): Promise<ActionResult> {
  try {
    await vehicleService.delete(id);
    revalidatePath("/vehicles");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** FormData → サービス層入力への変換 */
function extractVehicleInput(formData: FormData) {
  return {
    plateNumber: formData.get("plateNumber") as string,
    vin: (formData.get("vin") as string) || null,
    maker: formData.get("maker") as string,
    modelName: formData.get("modelName") as string,
    year: Number(formData.get("year")),
    color: (formData.get("color") as string) || null,
    mileage: Number(formData.get("mileage")) || 0,
    status: (formData.get("status") as string) || undefined,
    officeId: formData.get("officeId") as string,
  };
}
