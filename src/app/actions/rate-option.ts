"use server";

import { revalidatePath } from "next/cache";
import { rateOptionService } from "@/lib/services/rate-option-service";

type ActionResult = { success: true; data?: unknown } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

function extractInput(formData: FormData) {
  return {
    optionName: formData.get("optionName") as string,
    price: formData.get("price") as string,
    isActive: formData.get("isActive") === "true",
  };
}

export async function createRateOption(formData: FormData): Promise<ActionResult> {
  try {
    const data = await rateOptionService.create(extractInput(formData));
    revalidatePath("/rate-options");
    return { success: true, data };
  } catch (e) {
    const err = e as { message: string; fieldErrors?: Record<string, string[]> };
    return { success: false, error: err.message, fieldErrors: err.fieldErrors };
  }
}

export async function updateRateOption(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const data = await rateOptionService.update(id, extractInput(formData));
    revalidatePath("/rate-options");
    return { success: true, data };
  } catch (e) {
    const err = e as { message: string; fieldErrors?: Record<string, string[]> };
    return { success: false, error: err.message, fieldErrors: err.fieldErrors };
  }
}

export async function deleteRateOption(id: string): Promise<ActionResult> {
  try {
    await rateOptionService.delete(id);
    revalidatePath("/rate-options");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
