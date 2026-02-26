import { quotationService } from "@/lib/services/quotation-service";
import { accountService } from "@/lib/services/account-service";
import { vehicleClassService } from "@/lib/services/vehicle-class-service";
import { officeService } from "@/lib/services/office-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type QuotationRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { QuotationsHeader } from "./quotations-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const VALID_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "EXPIRED",
  "REJECTED",
];

export default async function QuotationsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = parseSearchParams(sp, {
    defaultSortBy: "quotationCode",
    defaultSortOrder: "desc",
  });

  // ステータスフィルタ
  const statusParam = typeof sp.status === "string" ? sp.status : null;
  const statusFilter: Record<string, unknown> = {};
  if (statusParam && VALID_STATUSES.includes(statusParam)) {
    statusFilter.status = statusParam;
  }

  const searchWhere = buildSearchWhere(params.search, searchConfigs.quotation.searchableColumns);
  const where = { ...statusFilter, ...searchWhere };

  const allowedSortColumns = [
    "quotationCode",
    "customerName",
    "status",
    "totalAmount",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "quotationCode";

  // データ取得を並列実行
  const [quotationResult, accountResult, vcResult, officeResult] = await Promise.all([
    quotationService.list({
      where,
      orderBy: { [orderByColumn]: params.sortOrder },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    accountService.list({ orderBy: { accountName: "asc" }, take: 500 }),
    vehicleClassService.list({ orderBy: { sortOrder: "asc" }, take: 100 }),
    officeService.list({ orderBy: { officeName: "asc" }, take: 100 }),
  ]);

  const { data: quotations, total: totalCount } = quotationResult;
  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: QuotationRow[] = quotations.map((q: any) => ({
    id: q.id,
    quotationCode: q.quotationCode,
    customerName: q.customerName,
    accountName: q.account?.accountName ?? null,
    status: q.status,
    totalAmount: q.totalAmount,
    validUntil: q.validUntil instanceof Date ? q.validUntil.toISOString() : q.validUntil,
  }));

  const accounts = accountResult.data.map((a: any) => ({
    id: a.id,
    accountName: a.accountName,
  }));

  const vehicleClasses = vcResult.data.map((vc: any) => ({
    id: vc.id,
    className: vc.className,
  }));

  const offices = officeResult.data.map((o: any) => ({
    id: o.id,
    officeName: o.officeName,
  }));

  return (
    <div className="space-y-6">
      <QuotationsHeader
        currentStatus={statusParam}
        accounts={accounts}
        vehicleClasses={vehicleClasses}
        offices={offices}
      />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="見積番号・宛名で検索..."
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
