/** インポート処理で使う共通型定義 */

/** パースされた行データ（キーは列名、値は文字列） */
export type RawRow = Record<string, string>;

/** パース結果 */
export type ParseResult = {
  sheetName: string;
  headers: string[];
  rows: RawRow[];
  totalRows: number;
};

/** インポート対象テーブル */
export type ImportTarget =
  | "company"
  | "customer"
  | "dailyReportDealer"
  | "salesRepAssignment"
  | "reservation"
  | "reservationTarget"
  | "salesTarget";

/** インポート結果 */
export type ImportResult = {
  target: ImportTarget;
  fileName: string;
  sheetName: string | null;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: { row: number; message: string }[];
};
