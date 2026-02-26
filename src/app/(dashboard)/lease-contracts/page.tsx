import { leaseContractService } from "@/lib/services/lease-contract-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type ContractRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { ContractsHeader } from "./contracts-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeaseContractsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = parseSearchParams(sp, {
    defaultSortBy: "contractNumber",
    defaultSortOrder: "desc",
  });

  // ステータスフィルタ
  const statusParam = typeof sp.status === "string" ? sp.status : null;
  const statusFilter: Record<string, unknown> = {};
  if (statusParam && ["ACTIVE", "EXPIRED", "TERMINATED"].includes(statusParam)) {
    statusFilter.status = statusParam;
  }

  const searchWhere = buildSearchWhere(
    params.search,
    searchConfigs.leaseContract.searchableColumns
  );
  const where = { ...statusFilter, ...searchWhere };

  const allowedSortColumns = [
    "contractNumber", "lesseeName", "startDate", "endDate", "status",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "contractNumber";

  const { data: contracts, total: totalCount } = await leaseContractService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  // サービスから返るデータを ContractRow にマッピング
  const rows: ContractRow[] = contracts.map((c) => {
    const contract = c as unknown as {
      id: string;
      contractNumber: string;
      externalId: string | null;
      lesseeType: "INDIVIDUAL" | "CORPORATE";
      lesseeCompanyCode: string | null;
      lesseeName: string;
      startDate: Date;
      endDate: Date;
      status: "ACTIVE" | "EXPIRED" | "TERMINATED";
      note: string | null;
      lines: Array<{ monthlyAmount: number }>;
    };

    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      externalId: contract.externalId,
      lesseeType: contract.lesseeType,
      lesseeCompanyCode: contract.lesseeCompanyCode,
      lesseeName: contract.lesseeName,
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate.toISOString(),
      lineCount: contract.lines.length,
      totalMonthlyAmount: contract.lines.reduce(
        (sum, line) => sum + line.monthlyAmount,
        0
      ),
      status: contract.status,
      note: contract.note,
    };
  });

  return (
    <div className="space-y-6">
      <ContractsHeader status={statusParam} />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="契約番号・リース先で検索..."
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
