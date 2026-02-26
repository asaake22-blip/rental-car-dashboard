import Link from "next/link";
import { notFound } from "next/navigation";
import { paymentService } from "@/lib/services/payment-service";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { DetailSection } from "@/components/record-detail/detail-section";
import { FieldDisplay } from "@/components/record-detail/field-display";
import { FieldLinkDisplay } from "@/components/record-detail/field-link-display";
import { Badge } from "@/components/ui/badge";
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
import { PaymentDetailActions } from "./payment-detail-actions";
import { AllocationForm } from "./allocation-form";

const categoryLabel: Record<string, string> = {
  BANK_TRANSFER: "銀行振込",
  CASH: "現金",
  CREDIT_CARD: "クレジットカード",
  ELECTRONIC_MONEY: "電子マネー",
  QR_PAYMENT: "QR決済",
  CHECK: "小切手",
  OTHER: "その他",
};

const statusLabel: Record<string, string> = {
  UNALLOCATED: "未消込",
  PARTIALLY_ALLOCATED: "一部消込",
  FULLY_ALLOCATED: "全額消込",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  UNALLOCATED: "secondary",
  PARTIALLY_ALLOCATED: "outline",
  FULLY_ALLOCATED: "default",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

type AllocationDetail = {
  id: string;
  allocatedAmount: number;
  note: string | null;
  reservation: {
    id: string;
    reservationCode: string;
    customerName: string;
    actualAmount: number;
    taxAmount: number | null;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
};

type PaymentDetail = {
  id: string;
  paymentNumber: string;
  paymentDate: Date;
  amount: number;
  paymentCategory: string;
  paymentProvider: string | null;
  payerName: string;
  terminalId: string | null;
  terminal: {
    id: string;
    terminalName: string;
  } | null;
  externalId: string | null;
  status: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  allocations: AllocationDetail[];
};

export default async function PaymentDetailPage({ params }: PageProps) {
  const { id } = await params;

  let raw;
  try {
    raw = await paymentService.get(id);
  } catch {
    notFound();
  }

  if (!raw) {
    notFound();
  }

  const payment = raw as unknown as PaymentDetail;

  const allocatedTotal = payment.allocations.reduce(
    (sum, a) => sum + a.allocatedAmount,
    0
  );
  const remainingAmount = payment.amount - allocatedTotal;

  const mfBaseUrl = process.env.NEXT_PUBLIC_MF_BASE_URL;

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "入金一覧", href: "/payments" },
          { label: payment.paymentNumber },
        ]}
      />

      <PaymentDetailActions
        id={payment.id}
        paymentNumber={payment.paymentNumber}
        externalId={payment.externalId}
        mfBaseUrl={mfBaseUrl ?? null}
        initialData={{
          paymentDate: payment.paymentDate.toISOString(),
          amount: payment.amount,
          paymentCategory: payment.paymentCategory,
          paymentProvider: payment.paymentProvider,
          payerName: payment.payerName,
          terminalId: payment.terminalId,
          terminalName: payment.terminal?.terminalName ?? null,
          externalId: payment.externalId,
          status: payment.status,
          allocatedTotal,
          note: payment.note,
        }}
      />

      <DetailSection title="入金情報">
        <FieldDisplay label="入金番号" value={payment.paymentNumber} />
        <FieldDisplay
          label="入金日"
          value={payment.paymentDate.toISOString().split("T")[0]}
          type="date"
        />
        <FieldDisplay label="金額" value={payment.amount} type="number" />
        <FieldDisplay
          label="カテゴリ"
          value={
            categoryLabel[payment.paymentCategory] ?? payment.paymentCategory
          }
        />
        <FieldDisplay label="プロバイダ" value={payment.paymentProvider} />
        <FieldDisplay label="入金元" value={payment.payerName} />
        <FieldLinkDisplay
          label="決済端末"
          value={payment.terminal?.terminalName ?? null}
          href={
            payment.terminal ? `/terminals/${payment.terminal.id}` : null
          }
        />
        <FieldDisplay label="外部ID" value={payment.externalId} />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            ステータス
          </p>
          <div>
            <Badge variant={statusVariant[payment.status] ?? "outline"}>
              {statusLabel[payment.status] ?? payment.status}
            </Badge>
          </div>
        </div>
        <FieldDisplay label="メモ" value={payment.note} />
      </DetailSection>

      {/* 消込明細セクション */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              消込明細
              <span className="text-sm font-normal text-muted-foreground">
                ({payment.allocations.length}件)
              </span>
            </div>
            <AllocationForm
              paymentId={payment.id}
              paymentRemaining={remainingAmount}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payment.allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              消込データはありません
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">
                        予約番号
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        請求書
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        顧客名
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-right">
                        精算金額
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-right">
                        消込金額
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-right">
                        消込割合
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        備考
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payment.allocations.map((alloc) => {
                      const reservationTotal =
                        (alloc.reservation.actualAmount ?? 0) + (alloc.reservation.taxAmount ?? 0);
                      const allocPercent =
                        reservationTotal > 0
                          ? Math.round(
                              (alloc.allocatedAmount / reservationTotal) * 100
                            )
                          : 0;
                      return (
                        <TableRow key={alloc.id}>
                          <TableCell className="whitespace-nowrap">
                            <Link
                              href={`/reservations/${alloc.reservation.id}`}
                              className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
                            >
                              {alloc.reservation.reservationCode}
                            </Link>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {alloc.invoice ? (
                              <Link
                                href={`/invoices/${alloc.invoice.id}`}
                                className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
                              >
                                {alloc.invoice.invoiceNumber}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {alloc.reservation.customerName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            {`\u00a5${reservationTotal.toLocaleString("ja-JP")}`}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            {`\u00a5${alloc.allocatedAmount.toLocaleString("ja-JP")}`}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            {allocPercent}%
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {alloc.note ?? "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* サマリ行 */}
              <div className="flex items-center gap-6 text-sm rounded-md bg-muted/50 px-4 py-3">
                <div>
                  <span className="text-muted-foreground">入金額: </span>
                  <span className="font-medium">
                    {`\u00a5${payment.amount.toLocaleString("ja-JP")}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">消込済: </span>
                  <span className="font-medium">
                    {`\u00a5${allocatedTotal.toLocaleString("ja-JP")}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">残額: </span>
                  <span
                    className={`font-medium ${remainingAmount > 0 ? "text-amber-600" : "text-green-600"}`}
                  >
                    {`\u00a5${remainingAmount.toLocaleString("ja-JP")}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailSection title="管理情報">
        <FieldDisplay
          label="作成日時"
          value={payment.createdAt.toLocaleString("ja-JP")}
        />
        <FieldDisplay
          label="更新日時"
          value={payment.updatedAt.toLocaleString("ja-JP")}
        />
      </DetailSection>
    </div>
  );
}
