import { vehicleClassService } from "@/lib/services/vehicle-class-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type VehicleClassRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { VehicleClassesHeader } from "./vehicle-classes-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VehicleClassesPage({ searchParams }: PageProps) {
  const params = parseSearchParams(await searchParams, {
    defaultSortBy: "sortOrder",
    defaultSortOrder: "asc",
  });

  const searchWhere = buildSearchWhere(params.search, searchConfigs.vehicleClass.searchableColumns);
  const where = searchWhere ?? {};

  const allowedSortColumns = ["classCode", "className", "sortOrder"];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "sortOrder";

  const { data: vehicleClasses, total: totalCount } = await vehicleClassService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: VehicleClassRow[] = vehicleClasses.map((vc) => {
    const counted = vc as unknown as {
      id: string;
      classCode: string;
      className: string;
      description: string | null;
      sortOrder: number;
      _count: { vehicles: number };
    };
    return {
      id: counted.id,
      classCode: counted.classCode,
      className: counted.className,
      description: counted.description,
      sortOrder: counted.sortOrder,
      vehicleCount: counted._count.vehicles,
    };
  });

  return (
    <div className="space-y-6">
      <VehicleClassesHeader />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="クラスコード・クラス名で検索..."
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
