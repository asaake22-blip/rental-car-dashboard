"use server";

/**
 * 決済端末（PaymentTerminal）の Server Actions
 *
 * サービス層を try-catch で呼び出し、revalidatePath で UI を即座に更新。
 */

import { revalidatePath } from "next/cache";
import { terminalService } from "@/lib/services/terminal-service";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "./types";

/** 端末作成 */
export async function createTerminal(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = extractTerminalInput(formData);
    await terminalService.create(input);
    revalidatePath("/terminals");
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

/** 端末更新 */
export async function updateTerminal(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = extractTerminalUpdateInput(formData);
    await terminalService.update(id, input);
    revalidatePath("/terminals");
    revalidatePath(`/terminals/${id}`);
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

/** 端末削除 */
export async function deleteTerminal(id: string): Promise<ActionResult> {
  try {
    await terminalService.delete(id);
    revalidatePath("/terminals");
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

/** Select 用の端末一覧を取得 */
export async function getTerminalListForSelect() {
  const { data } = await terminalService.list({
    where: { status: "ACTIVE" },
    orderBy: { terminalName: "asc" },
    take: 1000,
  });
  return (data as Array<{ id: string; terminalName: string; terminalType: string; office?: { officeName: string } | null }>).map((t) => ({
    id: t.id,
    terminalName: t.terminalName,
    terminalType: t.terminalType,
    officeName: t.office?.officeName ?? null,
  }));
}

// ── FormData 変換ヘルパー ────────────────────────────────

/** FormData → 端末作成入力への変換 */
function extractTerminalInput(formData: FormData) {
  return {
    terminalName: formData.get("terminalName") as string,
    terminalType: formData.get("terminalType") as string,
    provider: (formData.get("provider") as string) || null,
    modelName: (formData.get("modelName") as string) || null,
    serialNumber: (formData.get("serialNumber") as string) || null,
    officeId: formData.get("officeId") as string,
    note: (formData.get("note") as string) || null,
  };
}

/** FormData → 端末更新入力への変換（status 含む） */
function extractTerminalUpdateInput(formData: FormData) {
  return {
    terminalName: formData.get("terminalName") as string,
    terminalType: formData.get("terminalType") as string,
    provider: (formData.get("provider") as string) || null,
    modelName: (formData.get("modelName") as string) || null,
    serialNumber: (formData.get("serialNumber") as string) || null,
    officeId: formData.get("officeId") as string,
    status: (formData.get("status") as string) || undefined,
    note: (formData.get("note") as string) || null,
  };
}
