import { Suspense } from "react";
import {
  fetchKpiData,
  fetchMonthlyTrend,
  fetchAreaBreakdown,
  fetchOfficeRanking,
  fetchAvailableAreas,
  getCurrentFiscalYear,
} from "@/lib/dashboard/queries";
import type { DashboardFilters } from "@/lib/dashboard/types";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { DashboardFilters as FiltersUI } from "@/components/dashboard/dashboard-filters";
import { MonthlyReservationTrend, MonthlySalesTrend } from "@/components/dashboard/charts/monthly-trend";
import { AreaBreakdownChart } from "@/components/dashboard/charts/area-breakdown";
import { OfficeRankingChart } from "@/components/dashboard/charts/office-ranking";
import { Skeleton } from "@/components/ui/skeleton";
import { PdfExportButton } from "@/components/dashboard/pdf-export-button";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function parseFilters(params: Record<string, string | string[] | undefined>): DashboardFilters {
  const fy = params.fy;
  const fiscalYear = fy ? parseInt(String(fy), 10) : getCurrentFiscalYear();

  const m = params.month;
  const month = m ? parseInt(String(m), 10) : null;

  const area = params.area ? String(params.area) : null;
  const applyExclusions = params.exclude === "1";

  return {
    fiscalYear: isNaN(fiscalYear) ? getCurrentFiscalYear() : fiscalYear,
    month: month && !isNaN(month) ? month : null,
    area,
    applyExclusions,
  };
}

// KPIセクション（独立したasync Server Component）
async function KpiSection({ filters }: { filters: DashboardFilters }) {
  const kpiData = await fetchKpiData(filters);
  return <KpiCards data={kpiData} />;
}

// チャートセクション（独立したasync Server Component）
async function ChartsSection({ filters }: { filters: DashboardFilters }) {
  const [monthlyTrend, areaBreakdown, officeRanking] = await Promise.all([
    fetchMonthlyTrend(filters),
    fetchAreaBreakdown(filters),
    fetchOfficeRanking(filters),
  ]);

  return (
    <>
      {/* 月別推移チャート（2列） */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MonthlyReservationTrend data={monthlyTrend} />
        <MonthlySalesTrend data={monthlyTrend} />
      </div>

      {/* エリア別 + 営業所ランキング（2列） */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AreaBreakdownChart data={areaBreakdown} />
        <OfficeRankingChart data={officeRanking} />
      </div>
    </>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 11 }).map((_, i) => (
        <Skeleton key={i} className="h-[120px] rounded-xl" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[380px] rounded-xl" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[380px] rounded-xl" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const availableAreas = await fetchAvailableAreas();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">ダッシュボード</h2>
        <PdfExportButton
          fiscalYear={filters.fiscalYear}
          month={filters.month}
          area={filters.area}
          applyExclusions={filters.applyExclusions}
        />
      </div>

      {/* フィルタ */}
      <FiltersUI
        fiscalYear={filters.fiscalYear}
        month={filters.month}
        area={filters.area}
        applyExclusions={filters.applyExclusions}
        availableAreas={availableAreas}
      />

      {/* PDF出力キャプチャ対象 */}
      <div id="dashboard-print-area" className="space-y-6">
        {/* KPIカード */}
        <Suspense fallback={<KpiSkeleton />}>
          <KpiSection filters={filters} />
        </Suspense>

        {/* チャート */}
        <Suspense fallback={<ChartSkeleton />}>
          <ChartsSection filters={filters} />
        </Suspense>
      </div>
    </div>
  );
}
