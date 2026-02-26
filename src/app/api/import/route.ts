import { prisma } from "@/lib/prisma";
import { parseFile, getSheetNames } from "@/lib/import/parser";
import { getMapper } from "@/lib/import/mappers";
import type { ImportTarget, ImportResult } from "@/lib/import/types";
import { withAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";

const VALID_TARGETS: ImportTarget[] = [
  "company", "customer", "dailyReportDealer",
];

/** 型安全なモデルマップ */
const modelMap = {
  company: prisma.company,
  customer: prisma.customer,
  dailyReportDealer: prisma.dailyReportDealer,
} as const;
type ModelMapKey = keyof typeof modelMap;

/**
 * POST /api/import
 * multipart/form-data で file + target を受け取る
 */
export const POST = withAuth(async (req, _ctx) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const target = formData.get("target") as ImportTarget | null;
    const sheetName = formData.get("sheetName") as string | null;

    if (!file) {
      return apiError("ファイルが指定されていません", 400);
    }
    if (!target || !VALID_TARGETS.includes(target)) {
      return apiError(
        `インポート先が不正です。有効な値: ${VALID_TARGETS.join(", ")}`,
        400
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseFile(buffer, file.name, sheetName || undefined);
    const mapper = getMapper(target);

    const errors: { row: number; message: string }[] = [];
    const mapped: Record<string, unknown>[] = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      try {
        const data = mapper(parsed.rows[i]);
        if (Object.values(data).some((v) => v !== "" && v !== null && v !== undefined)) {
          mapped.push(data);
        }
      } catch (e) {
        errors.push({ row: i + 2, message: String(e) });
      }
    }

    // バッチ挿入（各テーブルに応じて）
    let importedRows = 0;
    const batchSize = 500;

    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize);
      try {
        const model = modelMap[target as ModelMapKey];
        // batch は動的にマッピングされたデータのため、型アサーションが必要
        const createMany = model.createMany as unknown as (args: { data: Record<string, unknown>[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
        await createMany({ data: batch, skipDuplicates: true });
        importedRows += batch.length;
      } catch (e) {
        for (let j = 0; j < batch.length; j++) {
          errors.push({ row: i + j + 2, message: String(e) });
        }
      }
    }

    // インポート履歴を記録
    await prisma.importHistory.create({
      data: {
        fileName: file.name,
        sheetName: parsed.sheetName,
        recordCount: importedRows,
        status: errors.length === 0 ? "SUCCESS" : importedRows > 0 ? "PARTIAL" : "FAILED",
        errorLog: errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : null,
      },
    });

    const result: ImportResult = {
      target,
      fileName: file.name,
      sheetName: parsed.sheetName,
      totalRows: parsed.totalRows,
      importedRows,
      skippedRows: parsed.totalRows - importedRows,
      errors: errors.slice(0, 20),
    };

    return apiSuccess(result);
  } catch (e) {
    console.error("インポートエラー:", e);
    return apiError("インポート処理でエラーが発生しました", 500);
  }
});

/**
 * GET /api/import?action=sheets&fileName=xxx
 * アップロード済みファイルのシート一覧を返す（プレビュー用）
 */
export const GET = withAuth(async (req, _ctx) => {
  const action = new URL(req.url).searchParams.get("action");

  if (action === "history") {
    const history = await prisma.importHistory.findMany({
      orderBy: { importedAt: "desc" },
      take: 50,
    });
    return apiSuccess(history);
  }

  return apiError("不正なアクション", 400);
});
