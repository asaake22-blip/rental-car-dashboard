import { notFound } from "next/navigation";
import Link from "next/link";
import { invoiceService } from "@/lib/services/invoice-service";
import { accountService } from "@/lib/services/account-service";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { DetailSection } from "@/components/record-detail/detail-section";
import { FieldDisplay } from "@/components/record-detail/field-display";
import { FieldLinkDisplay } from "@/components/record-detail/field-link-display";
import { LineItemsTable } from "@/components/line-items/line-items-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceDetailActions } from "./invoice-detail-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusLabels: Record<string, string> = {
  DRAFT: "下書き",
  ISSUED: "発行済",
  PAID: "入金済",
  OVERDUE: "延滞",
  CANCELLED: "取消",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  ISSUED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500",
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("ja-JP");
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  return `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;

  const invoice = await invoiceService.get(id);

  if (!invoice) {
    notFound();
  }

  const inv = invoice as any;

  // マスタデータ取得
  const [accountResult] = await Promise.all([
    accountService.list({ orderBy: { accountName: "asc" }, take: 500 }),
  ]);
  const accounts = accountResult.data.map((a: any) => ({
    id: a.id,
    accountName: a.accountName,
  }));

  const invoiceForEdit = {
    id: inv.id,
    accountId: inv.accountId ?? null,
    customerName: inv.customerName,
    customerCode: inv.customerCode,
    companyCode: inv.companyCode,
    issueDate: inv.issueDate instanceof Date ? inv.issueDate.toISOString() : inv.issueDate,
    dueDate: inv.dueDate instanceof Date ? inv.dueDate.toISOString() : inv.dueDate,
    amount: inv.amount,
    taxAmount: inv.taxAmount,
    totalAmount: inv.totalAmount,
    note: inv.note,
    lines: (inv.lines ?? []).map((l: any) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    })),
  };

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "請求書一覧", href: "/invoices" },
          { label: inv.invoiceNumber },
        ]}
      />

      <InvoiceDetailActions
        id={inv.id}
        invoiceNumber={inv.invoiceNumber}
        status={inv.status}
        externalUrl={inv.externalUrl}
        accounts={accounts}
        invoiceForEdit={invoiceForEdit}
      />

      {/* 基本情報 */}
      <DetailSection title="基本情報">
        <FieldDisplay label="請求書番号" value={inv.invoiceNumber} />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">ステータス</p>
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[inv.status] ?? ""}`}
            >
              {statusLabels[inv.status] ?? inv.status}
            </span>
          </div>
        </div>
        <FieldDisplay label="顧客名" value={inv.customerName} />
        <FieldLinkDisplay
          label="取引先"
          value={inv.account?.accountName ?? null}
          href={inv.accountId ? `/accounts/${inv.accountId}` : null}
        />
        <FieldDisplay label="顧客コード" value={inv.customerCode} />
        <FieldDisplay label="法人コード" value={inv.companyCode} />
        <FieldDisplay label="発行日" value={formatDate(inv.issueDate)} />
        <FieldDisplay label="支払期日" value={formatDate(inv.dueDate)} />
        <FieldDisplay label="備考" value={inv.note} />
      </DetailSection>

      {/* 金額情報 */}
      <DetailSection title="金額情報">
        <FieldDisplay label="税抜金額" value={formatAmount(inv.amount)} />
        <FieldDisplay label="消費税額" value={formatAmount(inv.taxAmount)} />
        <FieldDisplay label="税込金額" value={formatAmount(inv.totalAmount)} />
      </DetailSection>

      {/* 明細行 */}
      <LineItemsTable
        lines={(inv.lines ?? []).map((l: any) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.amount,
          taxRate: l.taxRate,
          taxAmount: l.taxAmount,
        }))}
        subtotal={inv.amount}
        totalTax={inv.taxAmount}
        total={inv.totalAmount}
      />

      {/* 予約情報 */}
      {inv.reservation && (
        <DetailSection title="予約情報">
          <FieldLinkDisplay
            label="予約番号"
            value={inv.reservation.reservationCode}
            href={`/reservations/${inv.reservation.id}`}
          />
          <FieldDisplay label="顧客名" value={inv.reservation.customerName ?? null} />
          <FieldLinkDisplay
            label="車両クラス"
            value={inv.reservation.vehicleClass?.className ?? null}
            href={inv.reservation.vehicleClassId ? `/vehicle-classes/${inv.reservation.vehicleClassId}` : null}
          />
          <FieldLinkDisplay
            label="出発営業所"
            value={inv.reservation.pickupOffice?.officeName ?? null}
            href={inv.reservation.pickupOfficeId ? `/offices/${inv.reservation.pickupOfficeId}` : null}
          />
        </DetailSection>
      )}

      {/* 入金消込情報 */}
      {inv.allocations && inv.allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">入金消込情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">入金番号</TableHead>
                    <TableHead className="whitespace-nowrap">入金日</TableHead>
                    <TableHead className="whitespace-nowrap text-right">消込金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inv.allocations.map((alloc: any) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="whitespace-nowrap">
                        <Link
                          href={`/payments/${alloc.payment?.id}`}
                          className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
                        >
                          {alloc.payment?.paymentNumber ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {alloc.payment?.paymentDate
                          ? formatDate(alloc.payment.paymentDate)
                          : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {formatAmount(alloc.allocatedAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* サマリ */}
            {(() => {
              const allocatedTotal = inv.allocations.reduce(
                (sum: number, a: any) => sum + a.allocatedAmount,
                0
              );
              const remaining = inv.totalAmount - allocatedTotal;
              return (
                <div className="flex items-center gap-6 text-sm rounded-md bg-muted/50 px-4 py-3 mt-3">
                  <div>
                    <span className="text-muted-foreground">請求額: </span>
                    <span className="font-medium">{formatAmount(inv.totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">消込済: </span>
                    <span className="font-medium">{formatAmount(allocatedTotal)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">残額: </span>
                    <span
                      className={`font-medium ${remaining > 0 ? "text-amber-600" : "text-green-600"}`}
                    >
                      {formatAmount(remaining)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* MF連携情報（externalId がある場合のみ） */}
      {inv.externalId && (
        <DetailSection title="マネーフォワード連携">
          <FieldDisplay label="外部ID" value={inv.externalId} />
          {inv.externalUrl && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">外部URL</p>
              <a
                href={inv.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link hover:text-link-hover active:text-link-active hover:underline text-sm"
              >
                マネーフォワードで開く
              </a>
            </div>
          )}
          <FieldDisplay label="外部ステータス" value={inv.externalStatus} />
          <FieldDisplay label="最終同期日時" value={formatDateTime(inv.syncedAt)} />
        </DetailSection>
      )}

      {/* 管理情報 */}
      <DetailSection title="管理情報">
        <FieldDisplay label="作成日時" value={formatDateTime(inv.createdAt)} />
        <FieldDisplay label="更新日時" value={formatDateTime(inv.updatedAt)} />
      </DetailSection>
    </div>
  );
}
