import { notFound } from "next/navigation";
import Link from "next/link";
import { quotationService } from "@/lib/services/quotation-service";
import { accountService } from "@/lib/services/account-service";
import { vehicleClassService } from "@/lib/services/vehicle-class-service";
import { officeService } from "@/lib/services/office-service";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { DetailSection } from "@/components/record-detail/detail-section";
import { FieldDisplay } from "@/components/record-detail/field-display";
import { FieldLinkDisplay } from "@/components/record-detail/field-link-display";
import { LineItemsTable } from "@/components/line-items/line-items-table";
import { QuotationDetailActions } from "./quotation-detail-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusLabels: Record<string, string> = {
  DRAFT: "下書き",
  SENT: "送付済",
  ACCEPTED: "承諾",
  EXPIRED: "期限切",
  REJECTED: "不成立",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ACCEPTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  EXPIRED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
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

export default async function QuotationDetailPage({ params }: PageProps) {
  const { id } = await params;

  const quotation = await quotationService.get(id);

  if (!quotation) {
    notFound();
  }

  const q = quotation as any;

  // 編集ダイアログ用のマスタデータを取得
  const [accountResult, vcResult, officeResult] = await Promise.all([
    accountService.list({ orderBy: { accountName: "asc" }, take: 500 }),
    vehicleClassService.list({ orderBy: { sortOrder: "asc" }, take: 100 }),
    officeService.list({ orderBy: { officeName: "asc" }, take: 100 }),
  ]);

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

  const quotationForEdit = {
    id: q.id,
    accountId: q.accountId,
    title: q.title,
    customerName: q.customerName,
    vehicleClassId: q.vehicleClassId,
    pickupDate: q.pickupDate instanceof Date ? q.pickupDate.toISOString() : q.pickupDate,
    returnDate: q.returnDate instanceof Date ? q.returnDate.toISOString() : q.returnDate,
    pickupOfficeId: q.pickupOfficeId,
    returnOfficeId: q.returnOfficeId,
    validUntil: q.validUntil instanceof Date ? q.validUntil.toISOString() : q.validUntil,
    note: q.note,
    lines: (q.lines ?? []).map((l: any) => ({
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
          { label: "見積書一覧", href: "/quotations" },
          { label: q.quotationCode },
        ]}
      />

      <QuotationDetailActions
        id={q.id}
        quotationCode={q.quotationCode}
        status={q.status}
        reservationId={q.reservationId}
        accounts={accounts}
        vehicleClasses={vehicleClasses}
        offices={offices}
        quotationForEdit={quotationForEdit}
      />

      {/* 基本情報 */}
      <DetailSection title="基本情報">
        <FieldDisplay label="見積番号" value={q.quotationCode} />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">ステータス</p>
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[q.status] ?? ""}`}
            >
              {statusLabels[q.status] ?? q.status}
            </span>
          </div>
        </div>
        <FieldDisplay label="見積書タイトル" value={q.title} />
        <FieldDisplay label="宛名" value={q.customerName} />
        <FieldLinkDisplay
          label="取引先"
          value={q.account?.accountName ?? null}
          href={`/accounts/${q.accountId}`}
        />
        <FieldDisplay label="有効期限" value={formatDate(q.validUntil)} />
        <FieldDisplay label="備考" value={q.note} />
      </DetailSection>

      {/* レンタル情報 */}
      <DetailSection title="レンタル情報">
        <FieldLinkDisplay
          label="車両クラス"
          value={q.vehicleClass?.className ?? null}
          href={q.vehicleClassId ? `/vehicle-classes/${q.vehicleClassId}` : null}
        />
        <FieldDisplay label="出発日時" value={formatDateTime(q.pickupDate)} />
        <FieldDisplay label="帰着日時" value={formatDateTime(q.returnDate)} />
        <FieldLinkDisplay
          label="出発営業所"
          value={q.pickupOffice?.officeName ?? null}
          href={q.pickupOfficeId ? `/offices/${q.pickupOfficeId}` : null}
        />
        <FieldLinkDisplay
          label="帰着営業所"
          value={q.returnOffice?.officeName ?? null}
          href={q.returnOfficeId ? `/offices/${q.returnOfficeId}` : null}
        />
      </DetailSection>

      {/* 金額情報 */}
      <DetailSection title="金額情報">
        <FieldDisplay label="税抜金額" value={formatAmount(q.amount)} />
        <FieldDisplay label="消費税額" value={formatAmount(q.taxAmount)} />
        <FieldDisplay label="税込金額" value={formatAmount(q.totalAmount)} />
      </DetailSection>

      {/* 明細行 */}
      <LineItemsTable
        lines={(q.lines ?? []).map((l: any) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.amount,
          taxRate: l.taxRate,
          taxAmount: l.taxAmount,
        }))}
        subtotal={q.amount}
        totalTax={q.taxAmount}
        total={q.totalAmount}
      />

      {/* 予約情報 */}
      {q.reservation && (
        <DetailSection title="予約情報">
          <FieldLinkDisplay
            label="予約番号"
            value={q.reservation.reservationCode}
            href={`/reservations/${q.reservation.id}`}
          />
          <FieldDisplay label="顧客名" value={q.reservation.customerName ?? null} />
          <FieldDisplay label="ステータス" value={q.reservation.status} />
        </DetailSection>
      )}

      {/* 管理情報 */}
      <DetailSection title="管理情報">
        <FieldDisplay label="作成日時" value={formatDateTime(q.createdAt)} />
        <FieldDisplay label="更新日時" value={formatDateTime(q.updatedAt)} />
      </DetailSection>
    </div>
  );
}
