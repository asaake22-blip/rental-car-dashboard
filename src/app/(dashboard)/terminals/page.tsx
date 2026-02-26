import { terminalService } from "@/lib/services/terminal-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type TerminalRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { TerminalsHeader } from "./terminals-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TerminalsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = parseSearchParams(sp, {
    defaultSortBy: "terminalCode",
    defaultSortOrder: "desc",
  });

  // ステータスフィルタ
  const statusParam = typeof sp.status === "string" ? sp.status : null;
  const statusFilter: Record<string, unknown> = {};
  if (
    statusParam &&
    ["ACTIVE", "INACTIVE", "MAINTENANCE"].includes(statusParam)
  ) {
    statusFilter.status = statusParam;
  }

  // 種別フィルタ
  const typeParam =
    typeof sp.terminalType === "string" ? sp.terminalType : null;
  const typeFilter: Record<string, unknown> = {};
  if (
    typeParam &&
    ["CREDIT_CARD", "ELECTRONIC_MONEY", "QR_PAYMENT", "MULTI"].includes(
      typeParam
    )
  ) {
    typeFilter.terminalType = typeParam;
  }

  const searchWhere = buildSearchWhere(
    params.search,
    searchConfigs.terminal.searchableColumns
  );
  const where = { ...statusFilter, ...typeFilter, ...searchWhere };

  const allowedSortColumns = [
    "terminalCode",
    "terminalName",
    "officeName",
    "status",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "terminalCode";

  const { data: terminals, total: totalCount } = await terminalService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  // サービスから返るデータを TerminalRow にマッピング
  const rows: TerminalRow[] = terminals.map((t) => {
    const terminal = t as unknown as {
      id: string;
      terminalCode: string;
      terminalName: string;
      terminalType: string;
      provider: string | null;
      modelName: string | null;
      serialNumber: string | null;
      officeId: string;
      office: { id: string; officeName: string };
      status: string;
      note: string | null;
      _count: { payments: number };
    };

    return {
      id: terminal.id,
      terminalCode: terminal.terminalCode,
      terminalName: terminal.terminalName,
      terminalType: terminal.terminalType,
      provider: terminal.provider,
      officeName: terminal.office.officeName,
      officeId: terminal.officeId,
      status: terminal.status,
      serialNumber: terminal.serialNumber,
      modelName: terminal.modelName,
      paymentCount: terminal._count.payments,
      note: terminal.note,
    };
  });

  return (
    <div className="space-y-6">
      <TerminalsHeader status={statusParam} terminalType={typeParam} />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="端末コード・名称・シリアル番号で検索..."
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
