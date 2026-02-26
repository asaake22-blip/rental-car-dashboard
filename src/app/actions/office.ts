"use server";

/**
 * 営業所（Office）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { officeService } from "@/lib/services/office-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 営業所を作成 */
export async function createOffice(formData: FormData): Promise<ActionResult> {
  try {
    const input = extractOfficeInput(formData);
    await officeService.create(input);
    revalidatePath("/offices");
    revalidatePath("/parking");
    revalidatePath("/vehicles");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 営業所を更新 */
export async function updateOffice(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const input = extractOfficeInput(formData);
    await officeService.update(id, input);
    revalidatePath("/offices");
    revalidatePath(`/offices/${id}`);
    revalidatePath("/parking");
    revalidatePath("/vehicles");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 営業所を削除 */
export async function deleteOffice(id: string): Promise<ActionResult> {
  try {
    await officeService.delete(id);
    revalidatePath("/offices");
    revalidatePath("/parking");
    revalidatePath("/vehicles");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** Select 用の営業所一覧を取得 */
export async function getOfficeListForSelect() {
  return officeService.listAll();
}

/** FormData -> サービス層入力への変換 */
function extractOfficeInput(formData: FormData) {
  return {
    officeName: formData.get("officeName") as string,
    area: (formData.get("area") as string) || null,
  };
}
