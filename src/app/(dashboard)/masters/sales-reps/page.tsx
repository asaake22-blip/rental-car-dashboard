import { salesRepService } from "@/lib/services/sales-rep-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type SalesRepRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SalesRepsPage({ searchParams }: PageProps) {
  const params = parseSearchParams(await searchParams, {
    defaultSortBy: "",
    defaultSortOrder: "desc",
  });

  const searchWhere = buildSearchWhere(
    params.search,
    searchConfigs.salesRepAssignment.searchableColumns
  );
  const where = searchWhere ?? {};

  const allowedSortColumns = [
    "salesRepName", "clientName", "storeName", "officeName",
    "customerCode", "companyCode", "departmentCode", "fiscalYear", "month",
  ];

  // デフォルトは複合ソート、単一カラム指定時はそのカラムのみ
  const orderBy = allowedSortColumns.includes(params.sortBy)
    ? { [params.sortBy]: params.sortOrder }
    : [
        { fiscalYear: "desc" as const },
        { month: "asc" as const },
        { salesRepName: "asc" as const },
      ];

  const { data: assignments, total: totalCount } = await salesRepService.list({
    where,
    orderBy,
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: SalesRepRow[] = assignments.map((a) => ({
    id: a.id,
    customerCode: a.customerCode,
    companyCode: a.companyCode,
    departmentCode: a.departmentCode,
    clientName: a.clientName,
    storeName: a.storeName,
    officeName: a.officeName,
    isNewThisTerm: a.isNewThisTerm,
    note: a.note,
    fiscalYear: a.fiscalYear,
    month: a.month,
    salesRepName: a.salesRepName,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">担当営業マスタ</h2>
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="担当者名・取引先で検索..."
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
