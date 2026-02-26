/**
 * ガントチャート（配車表）共通型定義
 */

/** ガントチャートの表示モード */
export type GanttViewMode = "month" | "3month" | "6month" | "3day";

/** ガントチャートの予約バーデータ */
export interface GanttReservation {
  id: string;
  reservationCode: string;
  status: string;
  customerName: string;
  customerPhone: string;
  pickupDate: string; // ISO string
  returnDate: string;
  pickupOfficeName: string;
  returnOfficeName: string;
  estimatedAmount: number | null;
}

/** ガントチャートの車両行データ */
export interface GanttVehicle {
  id: string;
  vehicleCode: string;
  maker: string;
  modelName: string;
  plateNumber: string | null;
  vehicleClassName: string;
  vehicleClassId: string;
  reservations: GanttReservation[];
}

/** 日付変更の保留データ */
export interface PendingChange {
  reservationId: string;
  reservationCode: string;
  originalPickupDate: string;
  originalReturnDate: string;
  newPickupDate: string;
  newReturnDate: string;
}

/** 配車表 API レスポンス */
export interface GanttData {
  vehicles: GanttVehicle[];
}

/** ステータスごとの色定義 */
export const STATUS_COLORS: Record<string, { fill: string; border: string; text: string }> = {
  RESERVED: { fill: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" },
  CONFIRMED: { fill: "#dcfce7", border: "#22c55e", text: "#15803d" },
  DEPARTED: { fill: "#fef9c3", border: "#eab308", text: "#a16207" },
  RETURNED: { fill: "#e0e7ff", border: "#6366f1", text: "#4338ca" },
  SETTLED: { fill: "#f3f4f6", border: "#9ca3af", text: "#4b5563" },
};

/** ガントチャート定数 */
export const GANTT_CONST = {
  ROW_HEIGHT: 44,
  HEADER_HEIGHT: 52,
  VEHICLE_COL_WIDTH: 220,
  DAY_COL_WIDTH: 40,
  HOUR_COL_WIDTH: 40,
  THREE_MONTH_COL_WIDTH: 14,
  SIX_MONTH_COL_WIDTH: 14,
  BAR_HEIGHT: 28,
  BAR_Y_OFFSET: 8,
  HANDLE_WIDTH: 6,
} as const;

/** viewMode に応じた列幅を返す */
export function getColWidth(viewMode: GanttViewMode): number {
  switch (viewMode) {
    case "month": return GANTT_CONST.DAY_COL_WIDTH;
    case "3month": return GANTT_CONST.THREE_MONTH_COL_WIDTH;
    case "6month": return GANTT_CONST.SIX_MONTH_COL_WIDTH;
    case "3day": return GANTT_CONST.HOUR_COL_WIDTH;
  }
}

/** viewMode に応じた1列あたりのミリ秒を返す */
export function getMsPerCol(viewMode: GanttViewMode): number {
  return viewMode === "3day" ? 3600000 : 86400000;
}
