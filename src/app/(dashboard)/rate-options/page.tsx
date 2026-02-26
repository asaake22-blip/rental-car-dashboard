import { rateOptionService } from "@/lib/services/rate-option-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type RateOptionRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { RateOptionHeader } from "./rate-option-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RateOptionsPage({ searchParams }: PageProps) {
  const params = parseSearchParams(await searchParams, {
    defaultSortBy: "optionName",
    defaultSortOrder: "asc",
  });

  const searchWhere = buildSearchWhere(params.search, searchConfigs.rateOption.searchableColumns);
  const where = searchWhere ?? {};

  const allowedSortColumns = ["optionName", "price", "isActive"];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "optionName";

  const { data: rateOptions, total: totalCount } = await rateOptionService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: RateOptionRow[] = rateOptions.map((ro) => {
    const option = ro as unknown as {
      id: string;
      optionName: string;
      price: number;
      isActive: boolean;
    };
    return {
      id: option.id,
      optionName: option.optionName,
      price: option.price,
      isActive: option.isActive,
    };
  });

  return (
    <div className="space-y-6">
      <RateOptionHeader />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="オプション名で検索..."
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
