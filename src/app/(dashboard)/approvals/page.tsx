import { approvalService } from "@/lib/services/approval-service";
import { ApprovalsContent } from "./approvals-content";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import type { ServerTableState } from "@/lib/data-table/types";
import type { ReservationApprovalRow } from "./approval-columns";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ApprovalsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = parseSearchParams(sp, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });

  const searchWhere = buildSearchWhere(params.search, searchConfigs.reservation.searchableColumns);

  const allowedSort = ["createdAt", "reservationCode", "customerName", "pickupDate"];
  const orderBy = allowedSort.includes(params.sortBy)
    ? { [params.sortBy]: params.sortOrder }
    : { createdAt: "desc" as const };

  const { data: reservations, total } = await approvalService.listPendingReservations({
    where: searchWhere,
    orderBy,
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const rows: ReservationApprovalRow[] = reservations.map((r: any) => ({
    id: r.id,
    reservationCode: r.reservationCode,
    customerName: r.customerName,
    pickupDate: r.pickupDate instanceof Date ? r.pickupDate.toISOString() : r.pickupDate,
    pickupOfficeName: r.pickupOffice?.officeName ?? "-",
    estimatedAmount: r.estimatedAmount,
    channel: r.channel,
  }));

  const tableState: ServerTableState = {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    totalCount: total,
    totalPages: Math.ceil(total / params.pageSize),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">承認一覧</h2>
        <span className="text-sm text-muted-foreground">
          未承認: {total}件
        </span>
      </div>
      <ApprovalsContent rows={rows} tableState={tableState} />
    </div>
  );
}
