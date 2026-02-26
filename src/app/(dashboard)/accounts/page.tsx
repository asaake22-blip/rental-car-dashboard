import { accountService } from "@/lib/services/account-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type AccountRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { AccountsHeader } from "./accounts-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AccountsPage({ searchParams }: PageProps) {
  const params = parseSearchParams(await searchParams, {
    defaultSortBy: "accountCode",
    defaultSortOrder: "asc",
  });

  const searchWhere = buildSearchWhere(params.search, searchConfigs.account.searchableColumns);
  const where = searchWhere ?? {};

  const allowedSortColumns = [
    "accountCode",
    "accountName",
    "accountType",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "accountCode";

  const { data: accounts, total: totalCount } = await accountService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: AccountRow[] = accounts.map((a: any) => ({
    id: a.id,
    accountCode: a.accountCode,
    accountName: a.accountName,
    accountNameKana: a.accountNameKana,
    accountType: a.accountType,
    phone: a.phone,
    paymentTermsLabel: a.paymentTermsLabel,
  }));

  return (
    <div className="space-y-6">
      <AccountsHeader />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="取引先名・コード・カナで検索..."
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
