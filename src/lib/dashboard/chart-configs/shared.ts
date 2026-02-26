// チャート共通設定

// --- カラーパレット ---
export const COLORS = {
  blue: "#2563eb",
  green: "#16a34a",
  orange: "#ea580c",
  purple: "#9333ea",
  cyan: "#0891b2",
  amber: "#ca8a04",
  red: "#dc2626",
  indigo: "#6366f1",
  lime: "#84cc16",
  rose: "#f43f5e",
  gray400: "#9ca3af",
  gray700: "#374151",
} as const;

// --- 共通型 ---

/** 折れ線チャートの系列定義 */
export interface SeriesConfig {
  dataKey: string;
  name: string;
  color: string;
  type: "solid" | "dashed";
  opacity?: number;
  dot?: boolean;
}

/** 閾値による色分け定義 */
export interface ThresholdConfig {
  min: number;
  color: string;
}

// --- 共通フォーマット関数 ---

/** 金額を万円/億円表記にフォーマット */
export function formatYen(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1)}億円`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString()}万円`;
  }
  return `${value.toLocaleString()}円`;
}

/** 金額を単位なしの万表記にフォーマット（Y軸用） */
export function formatManUnit(value: number): string {
  return `${value}万`;
}

/** パーセンテージ表記 */
export function formatPercent(value: number): string {
  return `${value}%`;
}

/** 金額を万/億表記にフォーマット（単位なし、KPIカード用） */
export function formatAmount(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}億`;
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}万`;
  return value.toLocaleString();
}
