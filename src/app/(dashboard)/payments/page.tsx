import { paymentService } from "@/lib/services/payment-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type PaymentRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { PaymentsHeader } from "./payments-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = parseSearchParams(sp, {
    defaultSortBy: "paymentNumber",
    defaultSortOrder: "desc",
  });

  // ステータスフィルタ
  const statusParam = typeof sp.status === "string" ? sp.status : null;
  const statusFilter: Record<string, unknown> = {};
  if (
    statusParam &&
    ["UNALLOCATED", "PARTIALLY_ALLOCATED", "FULLY_ALLOCATED"].includes(
      statusParam
    )
  ) {
    statusFilter.status = statusParam;
  }

  // カテゴリフィルタ
  const categoryParam = typeof sp.category === "string" ? sp.category : null;
  const categoryFilter: Record<string, unknown> = {};
  if (
    categoryParam &&
    [
      "BANK_TRANSFER",
      "CASH",
      "CREDIT_CARD",
      "ELECTRONIC_MONEY",
      "QR_PAYMENT",
      "CHECK",
      "OTHER",
    ].includes(categoryParam)
  ) {
    categoryFilter.paymentCategory = categoryParam;
  }

  const searchWhere = buildSearchWhere(
    params.search,
    searchConfigs.payment.searchableColumns
  );
  const where = { ...statusFilter, ...categoryFilter, ...searchWhere };

  const allowedSortColumns = [
    "paymentNumber",
    "paymentDate",
    "amount",
    "payerName",
    "status",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "paymentNumber";

  const { data: payments, total: totalCount } = await paymentService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  // サービスから返るデータを PaymentRow にマッピング
  const rows: PaymentRow[] = payments.map((p) => {
    const payment = p as unknown as {
      id: string;
      paymentNumber: string;
      paymentDate: Date;
      amount: number;
      paymentCategory: string;
      paymentProvider: string | null;
      payerName: string;
      terminalId: string | null;
      terminal: { id: string; terminalName: string } | null;
      externalId: string | null;
      status: string;
      note: string | null;
      allocations: Array<{ allocatedAmount: number }>;
    };

    const allocatedTotal = payment.allocations.reduce(
      (sum, a) => sum + a.allocatedAmount,
      0
    );

    return {
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      paymentDate: payment.paymentDate.toISOString(),
      amount: payment.amount,
      paymentCategory: payment.paymentCategory,
      paymentProvider: payment.paymentProvider,
      payerName: payment.payerName,
      terminalName: payment.terminal?.terminalName ?? null,
      terminalId: payment.terminalId,
      externalId: payment.externalId,
      status: payment.status,
      allocatedTotal,
      note: payment.note,
    };
  });

  return (
    <div className="space-y-6">
      <PaymentsHeader status={statusParam} category={categoryParam} />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="入金番号・入金元・プロバイダで検索..."
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
