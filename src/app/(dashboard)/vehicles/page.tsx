import { vehicleService } from "@/lib/services/vehicle-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type VehicleRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { VehiclesHeader } from "./vehicles-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VehiclesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = parseSearchParams(sp, {
    defaultSortBy: "vehicleCode",
    defaultSortOrder: "asc",
  });

  // ステータスフィルタ
  const statusParam = typeof sp.status === "string" ? sp.status : null;
  const statusFilter: Record<string, unknown> = {};
  if (statusParam && ["IN_STOCK", "LEASED", "MAINTENANCE", "RETIRED"].includes(statusParam)) {
    statusFilter.status = statusParam;
  }

  const searchWhere = buildSearchWhere(params.search, searchConfigs.vehicle.searchableColumns);
  const where = { ...statusFilter, ...searchWhere };

  const allowedSortColumns = [
    "vehicleCode", "plateNumber", "maker", "modelName", "year", "status", "mileage",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "vehicleCode";

  const { data: vehicles, total: totalCount } = await vehicleService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: VehicleRow[] = vehicles.map((v) => ({
    id: v.id,
    vehicleCode: (v as unknown as { vehicleCode: string }).vehicleCode,
    plateNumber: v.plateNumber,
    vin: v.vin,
    maker: v.maker,
    modelName: v.modelName,
    year: v.year,
    color: v.color,
    mileage: v.mileage,
    status: v.status as VehicleRow["status"],
    officeId: v.officeId,
    officeName: (v as unknown as { office?: { officeName: string } }).office?.officeName ?? null,
  }));

  return (
    <div className="space-y-6">
      <VehiclesHeader status={statusParam} />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="車両コード・ナンバー・メーカー・車種名で検索..."
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
