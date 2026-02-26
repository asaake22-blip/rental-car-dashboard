/**
 * マネーフォワード API クライアント
 *
 * MONEYFORWARD_API_KEY / MONEYFORWARD_BASE_URL が未設定の場合はスキップ。
 * 将来的に実際の MF クラウド請求書 API と連携予定。
 */

import type {
  MoneyForwardInvoiceData,
  MoneyForwardInvoiceResult,
} from "./types";

/** MF に請求書を作成 */
export async function createMoneyForwardInvoice(
  data: MoneyForwardInvoiceData,
): Promise<MoneyForwardInvoiceResult | null> {
  const apiKey = process.env.MONEYFORWARD_API_KEY;
  const baseUrl = process.env.MONEYFORWARD_BASE_URL;
  if (!apiKey || !baseUrl) return null;

  try {
    // TODO: 実際の MF API 呼び出しを実装
    // 現時点ではスタブとして null を返す
    console.log("[MoneyForward] API 呼び出しスタブ: 請求書作成", data);
    return null;
  } catch (error) {
    console.error("[MoneyForward] 請求書作成エラー:", error);
    return null;
  }
}

/** MF から請求書ステータスを取得 */
export async function getMoneyForwardInvoiceStatus(
  externalId: string,
): Promise<{ status: string } | null> {
  const apiKey = process.env.MONEYFORWARD_API_KEY;
  const baseUrl = process.env.MONEYFORWARD_BASE_URL;
  if (!apiKey || !baseUrl) return null;

  try {
    // TODO: 実際の MF API 呼び出しを実装
    console.log("[MoneyForward] API 呼び出しスタブ: ステータス取得", externalId);
    return null;
  } catch (error) {
    console.error("[MoneyForward] ステータス取得エラー:", error);
    return null;
  }
}

/** MF の請求書画面 URL を生成 */
export function getMoneyForwardInvoiceUrl(externalId: string): string | null {
  const baseUrl = process.env.MONEYFORWARD_BASE_URL;
  if (!baseUrl) return null;
  return `${baseUrl}/invoices/${externalId}`;
}
