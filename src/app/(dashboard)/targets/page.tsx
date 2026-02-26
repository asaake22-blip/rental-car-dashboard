import { targetService } from "@/lib/services/target-service";
import { TargetsContent } from "./targets-content";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import type { ServerTableState } from "@/lib/data-table/types";

// 当会計年度を取得（4月始まり）
function getCurrentFiscalYear() {
  const now = new Date();
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TargetsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // 予約目標パラメータ（rt_ プレフィックス）
  const otParams = parseSearchParams(sp, {
    prefix: "rt",
    defaultSortBy: "clientName",
    defaultSortOrder: "asc",
  });

  // 売上目標パラメータ（st_ プレフィックス）
  const stParams = parseSearchParams(sp, {
    prefix: "st",
    defaultSortBy: "clientName",
    defaultSortOrder: "asc",
  });

  const fiscalYear = getCurrentFiscalYear();

  // 検索条件 + 当会計年度フィルタ
  const otSearchWhere = buildSearchWhere(otParams.search, searchConfigs.reservationTarget.searchableColumns);
  const stSearchWhere = buildSearchWhere(stParams.search, searchConfigs.salesTarget.searchableColumns);

  const otWhere = { fiscalYear, ...otSearchWhere };
  const stWhere = { fiscalYear, ...stSearchWhere };

  // ソートカラムのバリデーション
  const allowedSortColumns = ["clientName", "storeName", "officeName", "fiscalYear", "month", "targetCount", "targetAmount"];

  const otOrderBy = allowedSortColumns.includes(otParams.sortBy)
    ? { [otParams.sortBy]: otParams.sortOrder }
    : [{ fiscalYear: "desc" as const }, { month: "asc" as const }, { clientName: "asc" as const }];

  const stOrderBy = allowedSortColumns.includes(stParams.sortBy)
    ? { [stParams.sortBy]: stParams.sortOrder }
    : [{ fiscalYear: "desc" as const }, { month: "asc" as const }, { clientName: "asc" as const }];

  const [otResult, stResult] = await Promise.all([
    targetService.listReservationTargets({
      where: otWhere,
      orderBy: otOrderBy,
      skip: (otParams.page - 1) * otParams.pageSize,
      take: otParams.pageSize,
    }),
    targetService.listSalesTargets({
      where: stWhere,
      orderBy: stOrderBy,
      skip: (stParams.page - 1) * stParams.pageSize,
      take: stParams.pageSize,
    }),
  ]);
  const { data: reservationTargets, total: otCount } = otResult;
  const { data: salesTargets, total: stCount } = stResult;

  const reservationTargetRows = reservationTargets.map((t) => ({
    id: t.id,
    clientName: t.clientName,
    storeName: t.storeName,
    officeName: t.officeName,
    fiscalYear: t.fiscalYear,
    month: t.month,
    targetCount: t.targetCount,
  }));

  const salesTargetRows = salesTargets.map((t) => ({
    id: t.id,
    clientName: t.clientName,
    storeName: t.storeName,
    officeName: t.officeName,
    fiscalYear: t.fiscalYear,
    month: t.month,
    targetAmount: t.targetAmount.toLocaleString("ja-JP") + "円",
  }));

  const otState: ServerTableState = {
    page: otParams.page,
    pageSize: otParams.pageSize,
    search: otParams.search,
    sortBy: otParams.sortBy,
    sortOrder: otParams.sortOrder,
    totalCount: otCount,
    totalPages: Math.ceil(otCount / otParams.pageSize),
  };

  const stState: ServerTableState = {
    page: stParams.page,
    pageSize: stParams.pageSize,
    search: stParams.search,
    sortBy: stParams.sortBy,
    sortOrder: stParams.sortOrder,
    totalCount: stCount,
    totalPages: Math.ceil(stCount / stParams.pageSize),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">目標管理</h2>
        <span className="text-sm text-muted-foreground">{fiscalYear}年度</span>
      </div>
      <TargetsContent
        reservationTargetRows={reservationTargetRows}
        salesTargetRows={salesTargetRows}
        otState={otState}
        stState={stState}
      />
    </div>
  );
}
