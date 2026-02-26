/**
 * Excel/CSV ファイルパーサー
 * ファイル形式を自動判定し、統一的な行データ配列を返す。
 */

import * as XLSX from "xlsx";
import type { ParseResult, RawRow } from "./types";

/**
 * ファイルバッファからシート一覧を取得
 */
export function getSheetNames(buffer: Buffer, fileName: string): string[] {
  if (isCSV(fileName)) {
    return [fileName];
  }
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames;
}

/**
 * ファイルをパースしてシートデータを返す
 * @param buffer ファイルのバイナリデータ
 * @param fileName ファイル名（拡張子で形式判定）
 * @param sheetName Excelの場合のシート名（省略時は最初のシート）
 */
export function parseFile(
  buffer: Buffer,
  fileName: string,
  sheetName?: string
): ParseResult {
  if (isCSV(fileName)) {
    return parseCSV(buffer, fileName);
  }
  return parseExcel(buffer, fileName, sheetName);
}

function isCSV(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".csv");
}

function parseCSV(buffer: Buffer, fileName: string): ParseResult {
  // SheetJSはCSVもパース可能
  const workbook = XLSX.read(buffer, { type: "buffer", codepage: 65001 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  const headers =
    jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

  return {
    sheetName: fileName,
    headers,
    rows: jsonData.map(normalizeRow),
    totalRows: jsonData.length,
  };
}

function parseExcel(
  buffer: Buffer,
  fileName: string,
  sheetName?: string
): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const targetSheet = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheet];

  if (!sheet) {
    throw new Error(`シート "${targetSheet}" が見つかりません（${fileName}）`);
  }

  const jsonData = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
  const headers =
    jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

  return {
    sheetName: targetSheet,
    headers,
    rows: jsonData.map(normalizeRow),
    totalRows: jsonData.length,
  };
}

/** #N/A や undefined を空文字に統一 */
function normalizeRow(row: RawRow): RawRow {
  const normalized: RawRow = {};
  for (const [key, value] of Object.entries(row)) {
    const strVal = String(value ?? "").trim();
    normalized[key] = strVal === "#N/A" || strVal === "undefined" ? "" : strVal;
  }
  return normalized;
}
