import { reservationService } from "@/lib/services/reservation-service";
import { vehicleClassService } from "@/lib/services/vehicle-class-service";
import { officeService } from "@/lib/services/office-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type ReservationRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { ReservationsHeader } from "./reservations-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const VALID_STATUSES = [
  "RESERVED",
  "CONFIRMED",
  "DEPARTED",
  "RETURNED",
  "SETTLED",
  "CANCELLED",
  "NO_SHOW",
];

export default async function ReservationsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = parseSearchParams(sp, {
    defaultSortBy: "pickupDate",
    defaultSortOrder: "desc",
  });

  // ステータスフィルタ
  const statusParam = typeof sp.status === "string" ? sp.status : null;
  const statusFilter: Record<string, unknown> = {};
  if (statusParam && VALID_STATUSES.includes(statusParam)) {
    statusFilter.status = statusParam;
  }

  const searchWhere = buildSearchWhere(params.search, searchConfigs.reservation.searchableColumns);
  const where = { ...statusFilter, ...searchWhere };

  const allowedSortColumns = [
    "reservationCode",
    "status",
    "customerName",
    "pickupDate",
    "returnDate",
    "estimatedAmount",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "pickupDate";

  // データ取得を並列実行
  const [reservationResult, vehicleClassResult, officeResult] = await Promise.all([
    reservationService.list({
      where,
      orderBy: { [orderByColumn]: params.sortOrder },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    vehicleClassService.list({ orderBy: { sortOrder: "asc" } }),
    officeService.list({ orderBy: { officeName: "asc" } }),
  ]);

  const { data: reservations, total: totalCount } = reservationResult;
  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: ReservationRow[] = reservations.map((r: any) => ({
    id: r.id,
    reservationCode: r.reservationCode,
    status: r.status,
    customerName: r.customerName,
    vehicleClassName: r.vehicleClass?.className ?? "-",
    pickupDate: r.pickupDate instanceof Date ? r.pickupDate.toISOString() : r.pickupDate,
    returnDate: r.returnDate instanceof Date ? r.returnDate.toISOString() : r.returnDate,
    pickupOfficeName: r.pickupOffice?.officeName ?? "-",
    estimatedAmount: r.estimatedAmount,
  }));

  const vehicleClasses = vehicleClassResult.data.map((vc: any) => ({
    id: vc.id,
    className: vc.className,
  }));

  const offices = officeResult.data.map((o: any) => ({
    id: o.id,
    officeName: o.officeName,
  }));

  return (
    <div className="space-y-6">
      <ReservationsHeader
        currentStatus={statusParam}
        vehicleClasses={vehicleClasses}
        offices={offices}
      />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="予約番号・顧客名・電話番号で検索..."
        totalCount={totalCount}
        page={params.page}
        pageSize={params.pageSize}
        totalPages={totalPages}
        search={params.search}
        sortBy={params.sortBy}
        sortOrder={params.sortOrder}
      />
    </div>
  );
}
