/**
 * RawRow → Prisma create data へのマッピング関数群
 *
 * 各テーブルごとにExcel/CSVのカラム名をDBカラムに変換する。
 * マッピングが不明な列は無視する。
 */

import type { RawRow, ImportTarget } from "./types";

// --- ヘルパー ---
function toIntOrZero(val: string): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function toDateOrNow(val: string): Date {
  if (!val) return new Date();
  // "20250903120936" のような形式に対応
  if (/^\d{14}$/.test(val)) {
    const y = val.slice(0, 4);
    const m = val.slice(4, 6);
    const d = val.slice(6, 8);
    const h = val.slice(8, 10);
    const mi = val.slice(10, 12);
    const s = val.slice(12, 14);
    return new Date(`${y}-${m}-${d}T${h}:${mi}:${s}`);
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function padCode(val: string, len: number): string {
  return val.padStart(len, "0");
}

// --- マッパー ---

export function mapCompany(row: RawRow) {
  return {
    customerCompanyCode: row["顧客会社コード"] || row["customerCompanyCode"] || "",
    companyNameKana: row["顧客会社名（カナ）"] || row["companyNameKana"] || "",
    officialName: row["正式名称"] || row["officialName"] || "",
    shortName: row["略式名称"] || row["shortName"] || "",
    channelCode: row["チャネルコード"] || row["channelCode"] || "",
  };
}

export function mapCustomer(row: RawRow) {
  return {
    area: row["エリア"] || row["area"] || null,
    dealer: row["ディーラー"] || row["dealer"] || null,
    channelCode: row["チャネルｺｰﾄﾞ"] || row["チャネルコード"] || row["channelCode"] || "",
    departmentCode: row["部署コード"] || row["departmentCode"] || "",
    companyCode: row["会社コード"] || row["companyCode"] || "",
    customerCompanyCode: row["顧客会社コード"] || row["customerCompanyCode"] || "",
    departmentCustomerCode: row["部署・顧客コード"] || row["departmentCustomerCode"] || "",
    departmentCustomerNameKana: row["部署・顧客名（カナ）"] || row["departmentCustomerNameKana"] || "",
    departmentCustomerName: row["部署・顧客名称"] || row["departmentCustomerName"] || "",
    shortName: row["略式名称"] || row["shortName"] || "",
  };
}

export function mapDailyReportDealer(row: RawRow) {
  return {
    companyCode: row["会社コード"] || row["companyCode"] || "",
    companyName: row["会社名"] || row["companyName"] || "",
  };
}

export function mapReservation(row: RawRow) {
  return {
    customerName: row["顧客名"] || row["customerName"] || "",
    customerNameKana: row["顧客名（カナ）"] || row["customerNameKana"] || "",
    customerPhone: row["電話番号"] || row["customerPhone"] || "",
    customerEmail: row["メール"] || row["customerEmail"] || null,
    customerCode: row["顧客コード"] || row["customerCode"] || null,
    entityType: toIntOrZero(row["個人法人区分"] || row["entityType"] || "1") || null,
    companyCode: row["会社コード"] || row["companyCode"] || null,
    channel: row["チャネル"] || row["channel"] || null,
    pickupDate: toDateOrNow(row["出発日時"] || row["pickupDate"] || ""),
    returnDate: toDateOrNow(row["帰着日時"] || row["returnDate"] || ""),
    estimatedAmount: toIntOrZero(row["見積金額"] || row["estimatedAmount"] || "0") || null,
    note: row["備考"] || row["note"] || null,
  };
}

/** テーブル名からマッパーを取得 */
export function getMapper(target: ImportTarget) {
  const mappers: Record<ImportTarget, (row: RawRow) => Record<string, unknown>> = {
    company: mapCompany,
    customer: mapCustomer,
    dailyReportDealer: mapDailyReportDealer,
    reservation: () => ({}), // 予約はUI経由で作成するため個別対応
    salesRepAssignment: () => ({}), // 月別正規化が必要なため個別対応
    reservationTarget: () => ({}),
    salesTarget: () => ({}),
  };
  return mappers[target];
}
