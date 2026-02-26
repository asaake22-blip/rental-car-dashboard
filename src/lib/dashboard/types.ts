// ダッシュボードの型定義

/** ダッシュボードフィルタ */
export interface DashboardFilters {
  fiscalYear: number;
  month: number | null; // null = 全月
  area: string | null; // null = 全エリア
  applyExclusions: boolean;
}

/** KPIカードデータ */
export interface KpiData {
  reservationCount: number;
  reservationCountPrev: number;
  salesAmount: number;
  salesAmountPrev: number;
  reservationTarget: number;
  salesTarget: number;
  pendingCount: number;
  unpaidAmount: number;
  allocationRate: number;
  // 予約・車両稼働 KPI
  todayDepartures: number;
  todayReturns: number;
  currentRentals: number;
  utilizationRate: number;
}

/** 月別推移データ（1ヶ月分） */
export interface MonthlyTrendItem {
  month: number; // 4〜12, 1〜3
  label: string; // "4月", "5月", ...
  reservationActual: number;
  reservationTarget: number;
  salesActual: number;
  salesTarget: number;
}

/** エリア別売上データ */
export interface AreaBreakdownItem {
  area: string;
  salesAmount: number;
}

/** 営業所別ランキングデータ */
export interface OfficeRankingItem {
  officeName: string;
  salesActual: number;
  salesTarget: number;
  achievementRate: number; // %
}
