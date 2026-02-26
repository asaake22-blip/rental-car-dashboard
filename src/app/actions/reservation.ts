"use server";

/**
 * 予約管理（Reservation）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { reservationService } from "@/lib/services/reservation-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 予約を作成 */
export async function createReservation(formData: FormData): Promise<ActionResult> {
  try {
    const input = extractReservationInput(formData);
    await reservationService.create(input);
    revalidatePath("/reservations");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 予約を更新 */
export async function updateReservation(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const input = extractReservationInput(formData);
    await reservationService.update(id, input);
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${id}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 予約をキャンセル */
export async function cancelReservation(id: string): Promise<ActionResult> {
  try {
    await reservationService.cancel(id);
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${id}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 車両を割当 */
export async function assignVehicle(
  reservationId: string,
  vehicleId: string,
): Promise<ActionResult> {
  try {
    await reservationService.assignVehicle(reservationId, vehicleId);
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${reservationId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 車両割当を解除 */
export async function unassignVehicle(reservationId: string): Promise<ActionResult> {
  try {
    await reservationService.unassignVehicle(reservationId);
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${reservationId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 出発（貸渡）処理 */
export async function departReservation(
  reservationId: string,
  actualPickupDate: string,
  departureOdometer: number,
): Promise<ActionResult> {
  try {
    await reservationService.depart(reservationId, {
      actualPickupDate: new Date(actualPickupDate),
      departureOdometer,
    });
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath("/dispatch");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 帰着処理 */
export async function returnReservation(
  reservationId: string,
  actualReturnDate: string,
  returnOdometer: number,
  fuelLevelAtReturn?: string,
): Promise<ActionResult> {
  try {
    await reservationService.return(reservationId, {
      actualReturnDate: new Date(actualReturnDate),
      returnOdometer,
      fuelLevelAtReturn: fuelLevelAtReturn || null,
    });
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath("/dispatch");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 精算処理 */
export async function settleReservation(
  reservationId: string,
  actualAmount: number,
  paymentCategory?: string,
  note?: string,
): Promise<ActionResult> {
  try {
    await reservationService.settle(reservationId, {
      actualAmount,
      paymentCategory,
      note: note || null,
    });
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath("/payments");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 車両クラスに属する空き車両（IN_STOCK）を取得 */
export async function getAvailableVehicles(vehicleClassId: string): Promise<{
  success: boolean;
  data?: { id: string; vehicleCode: string; maker: string; modelName: string; plateNumber: string | null }[];
  error?: string;
}> {
  try {
    const { vehicleService } = await import("@/lib/services/vehicle-service");
    const { data } = await vehicleService.list({
      where: { vehicleClassId, status: "IN_STOCK" },
      orderBy: { vehicleCode: "asc" },
      take: 100,
    });
    return {
      success: true,
      data: data.map((v: any) => ({
        id: v.id,
        vehicleCode: v.vehicleCode,
        maker: v.maker,
        modelName: v.modelName,
        plateNumber: v.plateNumber,
      })),
    };
  } catch {
    return { success: false, error: "車両の取得に失敗しました" };
  }
}

/** FormData -> サービス層入力への変換 */
function extractReservationInput(formData: FormData) {
  const pickupDateStr = formData.get("pickupDate") as string;
  const returnDateStr = formData.get("returnDate") as string;
  const estimatedAmountStr = formData.get("estimatedAmount") as string;
  const entityTypeStr = formData.get("entityType") as string;

  return {
    vehicleClassId: formData.get("vehicleClassId") as string,
    vehicleId: (formData.get("vehicleId") as string) || null,
    customerName: formData.get("customerName") as string,
    customerNameKana: formData.get("customerNameKana") as string,
    customerPhone: formData.get("customerPhone") as string,
    customerEmail: (formData.get("customerEmail") as string) || null,
    pickupDate: pickupDateStr ? new Date(pickupDateStr) : new Date(),
    returnDate: returnDateStr ? new Date(returnDateStr) : new Date(),
    pickupOfficeId: formData.get("pickupOfficeId") as string,
    returnOfficeId: formData.get("returnOfficeId") as string,
    estimatedAmount: estimatedAmountStr ? Number(estimatedAmountStr) : null,
    note: (formData.get("note") as string) || null,
    customerCode: (formData.get("customerCode") as string) || null,
    entityType: entityTypeStr && entityTypeStr !== "__none__" ? Number(entityTypeStr) : null,
    companyCode: (formData.get("companyCode") as string) || null,
    channel: (formData.get("channel") as string) || null,
  };
}
