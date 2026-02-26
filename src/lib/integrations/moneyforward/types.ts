/**
 * マネーフォワード API リクエスト/レスポンス型
 *
 * MF クラウド請求書 API のデータ構造を定義。
 */

/** MF 請求書明細行 */
export interface MFBillingItem {
  /** 品名・摘要 */
  name: string;
  /** 数量 */
  quantity: number;
  /** 単価 */
  unitPrice: number;
  /** 金額（税抜） */
  amount: number;
  /** 税率（例: 0.10） */
  taxRate: number;
  /** 消費税額 */
  taxAmount: number;
}

/** MF へ送信する請求書データ */
export interface MoneyForwardInvoiceData {
  /** 顧客名 */
  customerName: string;
  /** 顧客コード */
  customerCode?: string;
  /** 法人コード */
  companyCode?: string;
  /** MF 取引先 ID */
  partnerId?: string;
  /** MF 取引先コード */
  partnerCode?: string;
  /** 発行日（ISO 8601） */
  issueDate: string;
  /** 支払期日（ISO 8601） */
  dueDate: string;
  /** 請求金額（税抜） */
  amount: number;
  /** 消費税額 */
  taxAmount: number;
  /** 合計金額（税込） */
  totalAmount: number;
  /** 明細行 */
  items?: MFBillingItem[];
  /** 備考 */
  note?: string;
}

/** MF 請求書作成結果 */
export interface MoneyForwardInvoiceResult {
  /** MF 側の請求書 ID */
  externalId: string;
  /** MF 側の請求書 URL */
  externalUrl: string;
  /** MF 側のステータス */
  externalStatus: string;
}

/** MF 請求書ステータスレスポンス */
export interface MoneyForwardInvoiceStatusResponse {
  /** MF 側のステータス文字列 */
  status: string;
}

/** MF API エラーレスポンス */
export interface MoneyForwardErrorResponse {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
}
