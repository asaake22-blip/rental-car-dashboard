import { NextRequest } from "next/server";
import { parseFile, getSheetNames } from "@/lib/import/parser";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";

/**
 * POST /api/import/preview
 * ファイルをアップロードしてプレビューデータを返す
 */
export const POST = withAuth(async (request: NextRequest, _ctx) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sheetName = formData.get("sheetName") as string | null;

    if (!file) {
      return apiError("ファイルが指定されていません", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // シート一覧
    const sheets = getSheetNames(buffer, file.name);

    // パース（プレビューは先頭10行のみ）
    const parsed = parseFile(buffer, file.name, sheetName || undefined);
    const previewRows = parsed.rows.slice(0, 10);

    return apiSuccess({
      fileName: file.name,
      sheets,
      currentSheet: parsed.sheetName,
      headers: parsed.headers,
      previewRows,
      totalRows: parsed.totalRows,
    });
  } catch (e) {
    console.error("プレビューエラー:", e);
    return apiError("プレビュー処理でエラーが発生しました", 500);
  }
});
