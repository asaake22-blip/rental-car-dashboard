import { invoiceService } from "@/lib/services/invoice-service";
import { reservationService } from "@/lib/services/reservation-service";
import { accountService } from "@/lib/services/account-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type InvoiceRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { InvoicesHeader } from "./invoices-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const VALID_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PAID",
  "OVERDUE",
  "CANCELLED",
];

export default async function InvoicesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = parseSearchParams(sp, {
    defaultSortBy: "invoiceNumber",
    defaultSortOrder: "desc",
  });

  // ステータスフィルタ
  const statusParam = typeof sp.status === "string" ? sp.status : null;
  const statusFilter: Record<string, unknown> = {};
  if (statusParam && VALID_STATUSES.includes(statusParam)) {
    statusFilter.status = statusParam;
  }

  const searchWhere = buildSearchWhere(params.search, searchConfigs.invoice.searchableColumns);
  const where = { ...statusFilter, ...searchWhere };

  const allowedSortColumns = [
    "invoiceNumber",
    "customerName",
    "issueDate",
    "dueDate",
    "totalAmount",
    "status",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "invoiceNumber";

  // データ取得を並列実行
  const [invoiceResult, reservationResult, accountResult] = await Promise.all([
    invoiceService.list({
      where,
      orderBy: { [orderByColumn]: params.sortOrder },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    // 精算済み予約を取得（新規作成ダイアログ用）
    reservationService.list({
      where: { status: "SETTLED", entityType: 2 },
      orderBy: { reservationCode: "desc" },
      take: 100,
    }),
    // 取引先マスタ取得（フォームダイアログ用）
    accountService.list({
      orderBy: { accountName: "asc" },
      take: 500,
    }),
  ]);

  const { data: invoices, total: totalCount } = invoiceResult;
  const totalPages = Math.ceil(totalCount / params.pageSize);

  const accounts = accountResult.data.map((a: any) => ({
    id: a.id,
    accountName: a.accountName,
  }));

  const rows: InvoiceRow[] = invoices.map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    accountName: inv.account?.accountName ?? null,
    issueDate: inv.issueDate instanceof Date ? inv.issueDate.toISOString() : inv.issueDate,
    dueDate: inv.dueDate instanceof Date ? inv.dueDate.toISOString() : inv.dueDate,
    totalAmount: inv.totalAmount,
    status: inv.status,
  }));

  const settledReservations = reservationResult.data.map((r: any) => ({
    id: r.id,
    reservationCode: r.reservationCode,
    customerName: r.customerName,
  }));

  return (
    <div className="space-y-6">
      <InvoicesHeader
        currentStatus={statusParam}
        accounts={accounts}
        settledReservations={settledReservations}
      />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="請求書番号・顧客名・コードで検索..."
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
