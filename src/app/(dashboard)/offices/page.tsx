import { officeService } from "@/lib/services/office-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type OfficeRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { OfficesHeader } from "./offices-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OfficesPage({ searchParams }: PageProps) {
  const params = parseSearchParams(await searchParams, {
    defaultSortBy: "officeName",
    defaultSortOrder: "asc",
  });

  const searchWhere = buildSearchWhere(params.search, searchConfigs.office.searchableColumns);
  const where = searchWhere ?? {};

  const allowedSortColumns = ["officeName", "area"];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "officeName";

  const { data: offices, total: totalCount } = await officeService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: OfficeRow[] = offices.map((o) => {
    const counted = o as unknown as {
      id: string;
      officeName: string;
      area: string | null;
      _count: { vehicles: number; parkingLots: number };
    };
    return {
      id: counted.id,
      officeName: counted.officeName,
      area: counted.area,
      vehicleCount: counted._count.vehicles,
      parkingLotCount: counted._count.parkingLots,
    };
  });

  return (
    <div className="space-y-6">
      <OfficesHeader />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="営業所名・エリアで検索..."
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
