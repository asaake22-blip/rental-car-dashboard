import { companyService } from "@/lib/services/company-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type CompanyRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const params = parseSearchParams(await searchParams, {
    defaultSortBy: "customerCompanyCode",
    defaultSortOrder: "asc",
  });

  const searchWhere = buildSearchWhere(params.search, searchConfigs.company.searchableColumns);
  const where = searchWhere ?? {};

  const allowedSortColumns = [
    "customerCompanyCode", "companyNameKana", "officialName", "shortName", "channelCode",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "customerCompanyCode";

  const { data: companies, total: totalCount } = await companyService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: CompanyRow[] = companies.map((c) => ({
    customerCompanyCode: c.customerCompanyCode,
    companyNameKana: c.companyNameKana,
    officialName: c.officialName,
    shortName: c.shortName,
    channelCode: c.channelCode,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">会社マスタ</h2>
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="会社名・コードで検索..."
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
