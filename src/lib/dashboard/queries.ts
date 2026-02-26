import { prisma } from "@/lib/prisma";
import type {
  DashboardFilters,
  KpiData,
  MonthlyTrendItem,
  AreaBreakdownItem,
  OfficeRankingItem,
} from "./types";
import { officeRankingConfig } from "./chart-configs";

// 会計年度の月を実際のDateに変換
function fiscalMonthToDateRange(fiscalYear: number, month: number) {
  const year = month >= 4 ? fiscalYear : fiscalYear + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1); // 翌月1日
  return { start, end };
}

// 会計年度全体の日付範囲
function fiscalYearDateRange(fiscalYear: number) {
  const start = new Date(fiscalYear, 3, 1); // 4月1日
  const end = new Date(fiscalYear + 1, 3, 1); // 翌年4月1日
  return { start, end };
}

// 除外条件の取得
async function getExclusions() {
  const rules = await prisma.exclusionRule.findMany();
  return {
    channels: rules.filter((r) => r.ruleType === "CHANNEL").map((r) => r.value),
    companyCodes: rules
      .filter((r) => r.ruleType === "COMPANY_CODE")
      .map((r) => r.value),
  };
}

/**
 * 売上集計用の WHERE 条件を構築（Reservation ベース）
 * status: SETTLED + approvalStatus: APPROVED + revenueDate で日付フィルタ
 */
function buildReservationWhere(
  filters: DashboardFilters,
  exclusions: { channels: string[]; companyCodes: string[] } | null,
  dateOverride?: { gte: Date; lt: Date }
) {
  const { fiscalYear, month, area } = filters;
  const dateRange = dateOverride
    ? dateOverride
    : month
      ? (() => {
          const r = fiscalMonthToDateRange(fiscalYear, month);
          return { gte: r.start, lt: r.end };
        })()
      : (() => {
          const r = fiscalYearDateRange(fiscalYear);
          return { gte: r.start, lt: r.end };
        })();

  const where: Record<string, unknown> = {
    status: "SETTLED" as const,
    approvalStatus: "APPROVED" as const,
    revenueDate: dateRange,
  };

  // エリアフィルタ: pickupOffice の area でフィルタ
  if (area) {
    where.pickupOffice = { area };
  }

  // 除外条件
  if (filters.applyExclusions && exclusions) {
    if (exclusions.channels.length > 0)
      where.channel = { notIn: exclusions.channels };
    if (exclusions.companyCodes.length > 0)
      where.companyCode = { notIn: exclusions.companyCodes };
  }

  return where;
}

// 目標テーブルのWHERE条件
function buildTargetWhere(filters: DashboardFilters) {
  const where: Record<string, unknown> = { fiscalYear: filters.fiscalYear };
  if (filters.month) where.month = filters.month;
  return where;
}

/** KPIデータを取得（当月/前月/目標/未承認を並列取得） */
export async function fetchKpiData(
  filters: DashboardFilters
): Promise<KpiData> {
  const exclusions = filters.applyExclusions ? await getExclusions() : null;

  // 当月の日付範囲
  const currentMonth = filters.month || getCurrentFiscalMonth();
  const currentRange = fiscalMonthToDateRange(filters.fiscalYear, currentMonth);

  // 前月の日付範囲
  const prevMonth = currentMonth === 4 ? 3 : currentMonth === 1 ? 12 : currentMonth - 1;
  const prevFiscalYear =
    currentMonth === 4 ? filters.fiscalYear - 1 : filters.fiscalYear;
  const prevRange = fiscalMonthToDateRange(prevFiscalYear, prevMonth);

  // 今日の日付範囲（予約 KPI 用）
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const [
    reservationCount,
    reservationCountPrev,
    salesAgg,
    salesAggPrev,
    reservationTargetAgg,
    salesTargetAgg,
    pendingCount,
    settledTotal,
    allocatedTotal,
    todayDepartures,
    todayReturns,
    currentRentals,
    activeVehicles,
  ] = await Promise.all([
    // 当月予約件数（CANCELLED/NO_SHOW 除外、createdAt ベース）
    prisma.reservation.count({
      where: {
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        createdAt: { gte: currentRange.start, lt: currentRange.end },
      },
    }),
    // 前月予約件数
    prisma.reservation.count({
      where: {
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        createdAt: { gte: prevRange.start, lt: prevRange.end },
      },
    }),
    // 当月売上金額（SETTLED + APPROVED、revenueDate ベース）
    prisma.reservation.aggregate({
      _sum: { actualAmount: true },
      where: buildReservationWhere(filters, exclusions, {
        gte: currentRange.start,
        lt: currentRange.end,
      }),
    }),
    // 前月売上金額
    prisma.reservation.aggregate({
      _sum: { actualAmount: true },
      where: buildReservationWhere(
        { ...filters, month: prevMonth },
        exclusions,
        { gte: prevRange.start, lt: prevRange.end }
      ),
    }),
    // 予約目標（月指定）
    prisma.reservationTarget.aggregate({
      _sum: { targetCount: true },
      where: { fiscalYear: filters.fiscalYear, month: currentMonth },
    }),
    // 売上目標（月指定）
    prisma.salesTarget.aggregate({
      _sum: { targetAmount: true },
      where: { fiscalYear: filters.fiscalYear, month: currentMonth },
    }),
    // 未承認予約件数
    prisma.reservation.count({
      where: { approvalStatus: "PENDING" },
    }),
    // SETTLED 予約の合計（actualAmount + taxAmount）→ 未入金・消込率計算用
    prisma.reservation.aggregate({
      _sum: { actualAmount: true, taxAmount: true },
      where: { status: "SETTLED", approvalStatus: "APPROVED" },
    }),
    // 消込合計
    prisma.paymentAllocation.aggregate({
      _sum: { allocatedAmount: true },
    }),
    // 本日出発件数
    prisma.reservation.count({
      where: { status: "CONFIRMED", pickupDate: { gte: todayStart, lt: todayEnd } },
    }),
    // 本日帰着件数
    prisma.reservation.count({
      where: { status: "DEPARTED", returnDate: { gte: todayStart, lt: todayEnd } },
    }),
    // 現在貸出中
    prisma.reservation.count({
      where: { status: "DEPARTED" },
    }),
    // 稼働率計算用: 退役以外の車両数
    prisma.vehicle.count({
      where: { status: { not: "RETIRED" } },
    }),
  ]);

  const settledTotalAmount =
    (settledTotal._sum.actualAmount ?? 0) +
    (settledTotal._sum.taxAmount ?? 0);
  const allocated = allocatedTotal._sum.allocatedAmount ?? 0;
  const unpaidAmount = settledTotalAmount - allocated;
  const allocationRate =
    settledTotalAmount > 0 ? Math.round((allocated / settledTotalAmount) * 100) : 0;

  const utilizationRate =
    activeVehicles > 0
      ? Math.round((currentRentals / activeVehicles) * 100)
      : 0;

  return {
    reservationCount,
    reservationCountPrev,
    salesAmount: salesAgg._sum.actualAmount ?? 0,
    salesAmountPrev: salesAggPrev._sum.actualAmount ?? 0,
    reservationTarget: reservationTargetAgg._sum.targetCount ?? 0,
    salesTarget: salesTargetAgg._sum.targetAmount ?? 0,
    pendingCount,
    unpaidAmount,
    allocationRate,
    todayDepartures,
    todayReturns,
    currentRentals,
    utilizationRate,
  };
}

/** 月別推移データを取得 */
export async function fetchMonthlyTrend(
  filters: DashboardFilters
): Promise<MonthlyTrendItem[]> {
  const exclusions = filters.applyExclusions ? await getExclusions() : null;
  const MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
  const MONTH_LABELS = [
    "4月", "5月", "6月", "7月", "8月", "9月",
    "10月", "11月", "12月", "1月", "2月", "3月",
  ];

  // 年度全体の日付範囲で予約・売上を一括取得してJS側で月別に振り分け
  const fyRange = fiscalYearDateRange(filters.fiscalYear);

  const [reservations, settledReservations, reservationTargets, salesTargets] = await Promise.all([
    // 予約件数: createdAt ベース、CANCELLED/NO_SHOW 除外
    prisma.reservation.findMany({
      select: { createdAt: true },
      where: {
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        createdAt: { gte: fyRange.start, lt: fyRange.end },
      },
    }),
    // 売上金額: revenueDate ベース、SETTLED + APPROVED
    prisma.reservation.findMany({
      select: { revenueDate: true, actualAmount: true },
      where: buildReservationWhere(filters, exclusions, {
        gte: fyRange.start,
        lt: fyRange.end,
      }),
    }),
    // 予約目標
    prisma.reservationTarget.groupBy({
      by: ["month"],
      _sum: { targetCount: true },
      where: buildTargetWhere({ ...filters, month: null }),
    }),
    // 売上目標
    prisma.salesTarget.groupBy({
      by: ["month"],
      _sum: { targetAmount: true },
      where: buildTargetWhere({ ...filters, month: null }),
    }),
  ]);

  // 月別に集計
  const reservationByMonth = new Map<number, number>();
  const salesByMonth = new Map<number, number>();

  for (const r of reservations) {
    const m = r.createdAt.getMonth() + 1;
    reservationByMonth.set(m, (reservationByMonth.get(m) ?? 0) + 1);
  }
  for (const s of settledReservations) {
    if (!s.revenueDate) continue;
    const m = s.revenueDate.getMonth() + 1;
    salesByMonth.set(m, (salesByMonth.get(m) ?? 0) + (s.actualAmount ?? 0));
  }

  const reservationTargetMap = new Map(
    reservationTargets.map((t) => [t.month, t._sum.targetCount ?? 0])
  );
  const salesTargetMap = new Map(
    salesTargets.map((t) => [t.month, t._sum.targetAmount ?? 0])
  );

  return MONTHS.map((month, i) => ({
    month,
    label: MONTH_LABELS[i],
    reservationActual: reservationByMonth.get(month) ?? 0,
    reservationTarget: reservationTargetMap.get(month) ?? 0,
    salesActual: salesByMonth.get(month) ?? 0,
    salesTarget: salesTargetMap.get(month) ?? 0,
  }));
}

/** エリア別売上データを取得 */
export async function fetchAreaBreakdown(
  filters: DashboardFilters
): Promise<AreaBreakdownItem[]> {
  const exclusions = filters.applyExclusions ? await getExclusions() : null;
  const where = buildReservationWhere(filters, exclusions);

  // Prisma の groupBy は relation フィールドに使えないため、findMany + JS 集計
  const reservations = await prisma.reservation.findMany({
    where,
    select: {
      actualAmount: true,
      pickupOffice: { select: { area: true } },
    },
  });

  const areaMap = new Map<string, number>();
  for (const r of reservations) {
    const area = r.pickupOffice?.area ?? "未設定";
    areaMap.set(area, (areaMap.get(area) ?? 0) + (r.actualAmount ?? 0));
  }

  // 金額降順でソート
  return Array.from(areaMap.entries())
    .map(([area, salesAmount]) => ({ area, salesAmount }))
    .sort((a, b) => b.salesAmount - a.salesAmount);
}

/** 営業所別達成率ランキングを取得 */
export async function fetchOfficeRanking(
  filters: DashboardFilters
): Promise<OfficeRankingItem[]> {
  const exclusions = filters.applyExclusions ? await getExclusions() : null;
  const reservationWhere = buildReservationWhere(filters, exclusions);
  const targetWhere = buildTargetWhere(filters);

  const [reservations, targetsByOffice] = await Promise.all([
    // 売上: pickupOffice.officeName 別に JS 集計
    prisma.reservation.findMany({
      where: reservationWhere,
      select: {
        actualAmount: true,
        pickupOffice: { select: { officeName: true } },
      },
    }),
    // 目標: officeName 別に集計
    prisma.salesTarget.groupBy({
      by: ["officeName"],
      _sum: { targetAmount: true },
      where: targetWhere,
    }),
  ]);

  // JS で officeName 別に売上集計
  const salesMap = new Map<string, number>();
  for (const r of reservations) {
    const name = r.pickupOffice?.officeName ?? "未設定";
    salesMap.set(name, (salesMap.get(name) ?? 0) + (r.actualAmount ?? 0));
  }

  const targetMap = new Map(
    targetsByOffice.map((t) => [t.officeName, t._sum.targetAmount ?? 0])
  );

  // 全営業所名を統合（売上 or 目標がある営業所）
  const allOffices = new Set([...salesMap.keys(), ...targetMap.keys()]);

  const results: OfficeRankingItem[] = Array.from(allOffices).map((officeName) => {
    const salesActual = salesMap.get(officeName) ?? 0;
    const salesTarget = targetMap.get(officeName) ?? 0;
    return {
      officeName,
      salesActual,
      salesTarget,
      achievementRate: salesTarget > 0 ? Math.round((salesActual / salesTarget) * 100) : 0,
    };
  });

  // 達成率降順でソート、TOP N
  return results
    .sort((a, b) => b.achievementRate - a.achievementRate)
    .slice(0, officeRankingConfig.topN);
}

/** 利用可能なエリア一覧を取得（Office テーブルから） */
export async function fetchAvailableAreas(): Promise<string[]> {
  const results = await prisma.office.groupBy({
    by: ["area"],
    where: { area: { not: null } },
    orderBy: { area: "asc" },
  });
  return results.map((r) => r.area!).filter(Boolean);
}

/** 現在の会計年度の月を取得 */
function getCurrentFiscalMonth(): number {
  const now = new Date();
  return now.getMonth() + 1; // 1〜12
}

/** 現在の会計年度を取得 */
export function getCurrentFiscalYear(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  return month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
}
