"use server";

/**
 * 駐車場（ParkingLot / ParkingSpot）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { parkingService } from "@/lib/services/parking-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 駐車場を作成 */
export async function createParkingLot(formData: FormData): Promise<ActionResult> {
  try {
    const input = extractParkingLotInput(formData);
    await parkingService.createLot(input);
    revalidatePath("/parking");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 駐車場を更新 */
export async function updateParkingLot(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const input = extractParkingLotInput(formData);
    await parkingService.updateLot(id, input);
    revalidatePath("/parking");
    revalidatePath(`/parking/${id}`);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 駐車場を削除 */
export async function deleteParkingLot(id: string): Promise<ActionResult> {
  try {
    await parkingService.deleteLot(id);
    revalidatePath("/parking");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** スポット JSON 一括インポート */
export async function importParkingSpots(lotId: string, jsonString: string): Promise<ActionResult> {
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { success: false, error: "JSON の形式が不正です" };
    }

    await parkingService.importSpots(lotId, parsed);
    revalidatePath("/parking");
    revalidatePath(`/parking/${lotId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 車両をスポットに割当/解除 */
export async function assignVehicleToSpot(spotId: string, vehicleId: string | null): Promise<ActionResult> {
  try {
    await parkingService.assignVehicle(spotId, vehicleId);
    revalidatePath("/parking");
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** 営業所に所属する車両リストを取得（割当ダイアログ用） */
export async function getVehiclesForAssignment(
  officeId: string,
): Promise<ActionResult<Array<{ id: string; vehicleCode: string; plateNumber: string | null; maker: string; modelName: string }>>> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const vehicles = await prisma.vehicle.findMany({
      where: { officeId },
      orderBy: { vehicleCode: "asc" },
      select: { id: true, vehicleCode: true, plateNumber: true, maker: true, modelName: true },
    });
    return { success: true, data: vehicles };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** スポットレイアウト（座標・サイズ・回転）を一括保存 */
export async function saveParkingSpotLayout(
  lotId: string,
  spotsData: { spots: Array<{ number: string; x: number; y: number; width: number; height: number; rotation: number }> },
): Promise<ActionResult> {
  try {
    await parkingService.saveSpotLayout(lotId, spotsData);
    revalidatePath("/parking");
    revalidatePath(`/parking/${lotId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** アノテーション（駐車場形状データ）を一括保存 */
export async function saveParkingAnnotations(
  lotId: string,
  annotationsData: { annotations: Array<Record<string, unknown>> },
): Promise<ActionResult> {
  try {
    await parkingService.saveAnnotations(lotId, annotationsData);
    revalidatePath("/parking");
    revalidatePath(`/parking/${lotId}`);
    return { success: true };
  } catch (e) {
    if (e instanceof ValidationError) {
      return { success: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { success: false, error: e instanceof Error ? e.message : "予期しないエラー" };
  }
}

/** FormData → サービス層入力への変換 */
function extractParkingLotInput(formData: FormData) {
  return {
    officeId: formData.get("officeId") as string,
    name: formData.get("name") as string,
    canvasWidth: Number(formData.get("canvasWidth")) || 800,
    canvasHeight: Number(formData.get("canvasHeight")) || 600,
  };
}
