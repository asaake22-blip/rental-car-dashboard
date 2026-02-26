"use server";

import { revalidatePath } from "next/cache";
import { ratePlanService } from "@/lib/services/rate-plan-service";

type ActionResult = { success: true; data?: unknown } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

function extractInput(formData: FormData) {
  return {
    vehicleClassId: formData.get("vehicleClassId") as string,
    planName: formData.get("planName") as string,
    rateType: formData.get("rateType") as string,
    basePrice: formData.get("basePrice") as string,
    additionalHourPrice: formData.get("additionalHourPrice") as string,
    insurancePrice: formData.get("insurancePrice") as string,
    validFrom: formData.get("validFrom") as string,
    validTo: (formData.get("validTo") as string) || null,
    isActive: formData.get("isActive") === "true",
  };
}

export async function createRatePlan(formData: FormData): Promise<ActionResult> {
  try {
    const data = await ratePlanService.create(extractInput(formData));
    revalidatePath("/rate-plans");
    return { success: true, data };
  } catch (e) {
    const err = e as { message: string; fieldErrors?: Record<string, string[]> };
    return { success: false, error: err.message, fieldErrors: err.fieldErrors };
  }
}

export async function updateRatePlan(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const data = await ratePlanService.update(id, extractInput(formData));
    revalidatePath("/rate-plans");
    return { success: true, data };
  } catch (e) {
    const err = e as { message: string; fieldErrors?: Record<string, string[]> };
    return { success: false, error: err.message, fieldErrors: err.fieldErrors };
  }
}

export async function deleteRatePlan(id: string): Promise<ActionResult> {
  try {
    await ratePlanService.delete(id);
    revalidatePath("/rate-plans");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
