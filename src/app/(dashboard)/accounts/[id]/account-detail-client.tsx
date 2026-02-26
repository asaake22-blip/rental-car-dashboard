"use client";

/**
 * 取引先詳細クライアントコンポーネント
 *
 * Server Component (page.tsx) からデータを受け取り、
 * 関連リストの「新規」ボタンや行アクションなどのインタラクティブ機能を提供する。
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { DetailSection } from "@/components/record-detail/detail-section";
import { FieldDisplay } from "@/components/record-detail/field-display";
import { RelatedList, type RowAction } from "@/components/record-detail/related-list";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { AccountDetailActions } from "./account-detail-actions";
import { QuotationFormDialog } from "../../quotations/quotation-form-dialog";
import { InvoiceFormDialog } from "../../invoices/invoice-form-dialog";
import { ReservationFormDialog } from "../../reservations/reservation-form-dialog";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteQuotation } from "@/app/actions/quotation";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

interface AccountData {
  id: string;
  accountCode: string;
  accountName: string;
  accountNameKana: string | null;
  accountType: string;
  closingDay: number | null;
  paymentMonthOffset: number | null;
  paymentDay: number | null;
  paymentTermsLabel: string | null;
  zipCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  mfPartnerId: string | null;
  mfPartnerCode: string | null;
  legacyCompanyCode: string | null;
  createdAt: string;
  updatedAt: string;
  quotations: QuotationItem[];
  invoices: InvoiceItem[];
  reservations: ReservationItem[];
}

interface QuotationItem {
  id: string;
  quotationCode: string;
  customerName: string;
  status: string;
  totalAmount: number | null;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  status: string;
  totalAmount: number | null;
}

interface ReservationItem {
  id: string;
  reservationCode: string;
  customerName: string;
  status: string;
}

interface MasterData {
  accounts: { id: string; accountName: string }[];
  vehicleClasses: { id: string; className: string }[];
  offices: { id: string; officeName: string }[];
  settledReservations: { id: string; reservationCode: string; customerName: string }[];
}

interface AccountDetailClientProps {
  account: AccountData;
  masterData: MasterData;
}

// ---------------------------------------------------------------------------
// ラベルマップ
// ---------------------------------------------------------------------------

const accountTypeLabels: Record<string, string> = {
  CORPORATE: "法人",
  INDIVIDUAL: "個人",
};

const quotationStatusLabels: Record<string, string> = {
  DRAFT: "下書き",
  SENT: "送付済",
  ACCEPTED: "承諾",
  EXPIRED: "期限切",
  REJECTED: "不成立",
};

const invoiceStatusLabels: Record<string, string> = {
  DRAFT: "下書き",
  ISSUED: "発行済",
  PAID: "入金済",
  OVERDUE: "延滞",
  CANCELLED: "取消",
};

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function formatDateTime(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
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

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

export function AccountDetailClient({ account, masterData }: AccountDetailClientProps) {
  const router = useRouter();
  const acc = account;

  // ダイアログ状態管理
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [deleteQuotationTarget, setDeleteQuotationTarget] = useState<QuotationItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // 見積書削除ハンドラー
  const handleDeleteQuotation = () => {
    if (!deleteQuotationTarget) return;
    startTransition(async () => {
      const result = await deleteQuotation(deleteQuotationTarget.id);
      if (result.success) {
        toast.success("見積書を削除しました");
        setDeleteQuotationTarget(null);
      } else {
        toast.error(result.error ?? "削除に失敗しました");
      }
    });
  };

  // 見積書の行アクション
  const quotationRowActions: RowAction<QuotationItem>[] = [
    {
      key: "edit",
      label: "詳細を表示",
      icon: Pencil,
      onClick: (row) => router.push(`/quotations/${row.id}`),
    },
    {
      key: "delete",
      label: "削除",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteQuotationTarget(row),
      hidden: (row) => row.status !== "DRAFT",
    },
  ];

  // 請求書の行アクション
  const invoiceRowActions: RowAction<InvoiceItem>[] = [
    {
      key: "edit",
      label: "詳細を表示",
      icon: Pencil,
      onClick: (row) => router.push(`/invoices/${row.id}`),
    },
  ];

  // 予約の行アクション
  const reservationRowActions: RowAction<ReservationItem>[] = [
    {
      key: "edit",
      label: "詳細を表示",
      icon: Pencil,
      onClick: (row) => router.push(`/reservations/${row.id}`),
    },
  ];

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "取引先一覧", href: "/accounts" },
          { label: acc.accountCode },
        ]}
      />

      <AccountDetailActions
        id={acc.id}
        accountCode={acc.accountCode}
        accountName={acc.accountName}
        accountForEdit={{
          id: acc.id,
          accountName: acc.accountName,
          accountNameKana: acc.accountNameKana,
          accountType: acc.accountType,
          closingDay: acc.closingDay,
          paymentMonthOffset: acc.paymentMonthOffset,
          paymentDay: acc.paymentDay,
          paymentTermsLabel: acc.paymentTermsLabel,
          zipCode: acc.zipCode,
          address: acc.address,
          phone: acc.phone,
          email: acc.email,
          mfPartnerId: acc.mfPartnerId,
          mfPartnerCode: acc.mfPartnerCode,
          legacyCompanyCode: acc.legacyCompanyCode,
        }}
      />

      {/* 基本情報 */}
      <DetailSection title="基本情報">
        <FieldDisplay label="取引先コード" value={acc.accountCode} />
        <FieldDisplay label="取引先名" value={acc.accountName} />
        <FieldDisplay label="取引先名（カナ）" value={acc.accountNameKana} />
        <FieldDisplay label="区分" value={accountTypeLabels[acc.accountType] ?? acc.accountType} />
        <FieldDisplay label="電話番号" value={acc.phone} />
        <FieldDisplay label="メールアドレス" value={acc.email} />
        <FieldDisplay label="郵便番号" value={acc.zipCode} />
        <FieldDisplay label="住所" value={acc.address} />
      </DetailSection>

      {/* 支払条件 */}
      <DetailSection title="支払条件">
        <FieldDisplay label="締日" value={acc.closingDay != null ? `${acc.closingDay}日` : null} />
        <FieldDisplay label="支払月オフセット" value={acc.paymentMonthOffset != null ? `${acc.paymentMonthOffset}ヶ月後` : null} />
        <FieldDisplay label="支払日" value={acc.paymentDay != null ? `${acc.paymentDay}日` : null} />
        <FieldDisplay label="支払条件ラベル" value={acc.paymentTermsLabel} />
      </DetailSection>

      {/* 外部連携 */}
      {(acc.mfPartnerId || acc.mfPartnerCode || acc.legacyCompanyCode) && (
        <DetailSection title="外部連携">
          <FieldDisplay label="MFクラウド取引先ID" value={acc.mfPartnerId} />
          <FieldDisplay label="MFクラウド取引先コード" value={acc.mfPartnerCode} />
          <FieldDisplay label="旧法人コード" value={acc.legacyCompanyCode} />
        </DetailSection>
      )}

      {/* 関連：見積書 */}
      <RelatedList<QuotationItem>
        title="見積書"
        items={acc.quotations ?? []}
        totalCount={acc.quotations?.length ?? 0}
        viewAllHref={`/quotations?accountId=${acc.id}`}
        onNew={() => setQuotationDialogOpen(true)}
        newButtonLabel="新規見積書"
        rowActions={quotationRowActions}
        columns={[
          {
            header: "見積番号",
            accessor: (q) => (
              <Link
                href={`/quotations/${q.id}`}
                className="text-link hover:text-link-hover active:text-link-active hover:underline"
              >
                {q.quotationCode}
              </Link>
            ),
          },
          {
            header: "宛名",
            accessor: (q) => q.customerName,
          },
          {
            header: "ステータス",
            accessor: (q) => quotationStatusLabels[q.status] ?? q.status,
          },
          {
            header: "税込金額",
            accessor: (q) => formatAmount(q.totalAmount),
          },
        ]}
      />

      {/* 関連：請求書 */}
      <RelatedList<InvoiceItem>
        title="請求書"
        items={acc.invoices ?? []}
        totalCount={acc.invoices?.length ?? 0}
        viewAllHref={`/invoices?accountId=${acc.id}`}
        onNew={() => setInvoiceDialogOpen(true)}
        newButtonLabel="新規請求書"
        rowActions={invoiceRowActions}
        columns={[
          {
            header: "請求書番号",
            accessor: (inv) => (
              <Link
                href={`/invoices/${inv.id}`}
                className="text-link hover:text-link-hover active:text-link-active hover:underline"
              >
                {inv.invoiceNumber}
              </Link>
            ),
          },
          {
            header: "顧客名",
            accessor: (inv) => inv.customerName,
          },
          {
            header: "ステータス",
            accessor: (inv) => invoiceStatusLabels[inv.status] ?? inv.status,
          },
          {
            header: "税込金額",
            accessor: (inv) => formatAmount(inv.totalAmount),
          },
        ]}
      />

      {/* 関連：予約 */}
      <RelatedList<ReservationItem>
        title="予約"
        items={acc.reservations ?? []}
        totalCount={acc.reservations?.length ?? 0}
        viewAllHref={`/reservations?accountId=${acc.id}`}
        onNew={() => setReservationDialogOpen(true)}
        newButtonLabel="新規予約"
        rowActions={reservationRowActions}
        columns={[
          {
            header: "予約番号",
            accessor: (r) => (
              <Link
                href={`/reservations/${r.id}`}
                className="text-link hover:text-link-hover active:text-link-active hover:underline"
              >
                {r.reservationCode}
              </Link>
            ),
          },
          {
            header: "顧客名",
            accessor: (r) => r.customerName,
          },
          {
            header: "ステータス",
            accessor: (r) => r.status,
          },
        ]}
      />

      {/* 管理情報 */}
      <DetailSection title="管理情報">
        <FieldDisplay label="作成日時" value={formatDateTime(acc.createdAt)} />
        <FieldDisplay label="更新日時" value={formatDateTime(acc.updatedAt)} />
      </DetailSection>

      {/* 見積書作成ダイアログ */}
      <QuotationFormDialog
        open={quotationDialogOpen}
        onOpenChange={setQuotationDialogOpen}
        accounts={masterData.accounts}
        vehicleClasses={masterData.vehicleClasses}
        offices={masterData.offices}
      />

      {/* 請求書作成ダイアログ */}
      <InvoiceFormDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        accounts={masterData.accounts}
        settledReservations={masterData.settledReservations}
      />

      {/* 予約作成ダイアログ */}
      <ReservationFormDialog
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
        vehicleClasses={masterData.vehicleClasses}
        offices={masterData.offices}
      />

      {/* 見積書削除確認ダイアログ */}
      <ConfirmDialog
        open={deleteQuotationTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteQuotationTarget(null);
        }}
        title="見積書の削除"
        description={
          deleteQuotationTarget
            ? `見積書「${deleteQuotationTarget.quotationCode}」を削除しますか？この操作は取り消せません。`
            : ""
        }
        actionLabel="削除"
        onConfirm={handleDeleteQuotation}
        isPending={isPending}
      />
    </div>
  );
}
