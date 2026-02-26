import { customerService } from "@/lib/services/customer-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type CustomerRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const params = parseSearchParams(await searchParams, {
    defaultSortBy: "departmentCustomerCode",
    defaultSortOrder: "asc",
  });

  const searchWhere = buildSearchWhere(params.search, searchConfigs.customer.searchableColumns);
  const where = searchWhere ?? {};

  const allowedSortColumns = [
    "departmentCustomerCode", "departmentCustomerName", "departmentCustomerNameKana",
    "shortName", "area", "dealer", "channelCode", "departmentCode",
    "companyCode", "customerCompanyCode",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "departmentCustomerCode";

  const { data: customers, total: totalCount } = await customerService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: CustomerRow[] = customers.map((c) => ({
    id: c.id,
    area: c.area,
    dealer: c.dealer,
    channelCode: c.channelCode,
    departmentCode: c.departmentCode,
    companyCode: c.companyCode,
    customerCompanyCode: c.customerCompanyCode,
    departmentCustomerCode: c.departmentCustomerCode,
    departmentCustomerName: c.departmentCustomerName,
    departmentCustomerNameKana: c.departmentCustomerNameKana,
    shortName: c.shortName,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">顧客マスタ</h2>
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="顧客名・コードで検索..."
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
