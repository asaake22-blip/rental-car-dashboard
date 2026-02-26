"use client";

/**
 * 請求書詳細ページのアクション（RecordActionBar + 編集ダイアログ）
 *
 * ステータスに応じてアクションボタンを表示:
 * - DRAFT: 編集（secondary）、発行（primary）、キャンセル（secondary）
 * - ISSUED: 入金確認（primary）、キャンセル（secondary）
 * - OVERDUE: 入金確認（primary）
 * - PAID/CANCELLED: アクションなし
 */

import { useState, useTransition } from "react";
import { Pencil, Send, Check, XCircle, ExternalLink } from "lucide-react";
import {
  RecordActionBar,
  type Action,
} from "@/components/record-detail/record-action-bar";
import { InvoiceFormDialog } from "../invoice-form-dialog";
import { issueInvoice, markInvoicePaid, cancelInvoice } from "@/app/actions/invoice";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  DRAFT: "下書き",
  ISSUED: "発行済",
  PAID: "入金済",
  OVERDUE: "延滞",
  CANCELLED: "取消",
};

/** ステータスバッジの色（RecordActionBar の statusBadge.color に渡す） */
const statusColors: Record<string, string> = {
  DRAFT: "#6b7280",
  ISSUED: "#2563eb",
  PAID: "#16a34a",
  OVERDUE: "#dc2626",
  CANCELLED: "#9ca3af",
};

interface InvoiceDetailActionsProps {
  id: string;
  invoiceNumber: string;
  status: string;
  externalUrl: string | null;
  accounts: { id: string; accountName: string }[];
  invoiceForEdit: {
    id: string;
    accountId: string | null;
    customerName: string;
    customerCode: string | null;
    companyCode: string | null;
    issueDate: string;
    dueDate: string;
    amount: number;
    taxAmount: number;
    totalAmount: number;
    note: string | null;
    lines: { description: string; quantity: number; unitPrice: number; taxRate: number }[];
  };
}

export function InvoiceDetailActions({
  id,
  invoiceNumber,
  status,
  externalUrl,
  accounts,
  invoiceForEdit,
}: InvoiceDetailActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canEdit = status === "DRAFT";
  const canIssue = status === "DRAFT";
  const canMarkPaid = status === "ISSUED" || status === "OVERDUE";
  const canCancel = status === "DRAFT" || status === "ISSUED";

  const handleIssue = () => {
    startTransition(async () => {
      const result = await issueInvoice(id);
      if (result.success) {
        toast.success("請求書を発行しました");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleMarkPaid = () => {
    startTransition(async () => {
      const result = await markInvoicePaid(id);
      if (result.success) {
        toast.success("入金を確認しました");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelInvoice(id);
      if (result.success) {
        toast.success("請求書をキャンセルしました");
      } else {
        toast.error(result.error);
      }
    });
  };

  // --- アクション配列の構築 ---

  const primaryActions: Action[] = [];
  const secondaryActions: Action[] = [];

  // MF外部リンク（externalUrl が存在する場合）
  if (externalUrl) {
    const url = externalUrl;
    primaryActions.push({
      key: "mf-link",
      label: "マネーフォワードで開く",
      icon: ExternalLink,
      variant: "outline",
      onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
    });
  }

  // 発行（DRAFT のみ） → primaryActions
  if (canIssue) {
    primaryActions.push({
      key: "issue",
      label: "発行",
      icon: Send,
      variant: "default",
      onClick: handleIssue,
      disabled: isPending,
      loading: isPending,
    });
  }

  // 入金確認（ISSUED / OVERDUE のみ） → primaryActions
  if (canMarkPaid) {
    primaryActions.push({
      key: "mark-paid",
      label: "入金確認",
      icon: Check,
      variant: "default",
      onClick: handleMarkPaid,
      disabled: isPending,
      loading: isPending,
    });
  }

  // 編集（DRAFT のみ） → secondaryActions
  if (canEdit) {
    secondaryActions.push({
      key: "edit",
      label: "編集",
      icon: Pencil,
      onClick: () => setEditOpen(true),
      disabled: isPending,
    });
  }

  // キャンセル（DRAFT / ISSUED のみ） → secondaryActions
  if (canCancel) {
    secondaryActions.push({
      key: "cancel",
      label: "キャンセル",
      icon: XCircle,
      variant: "destructive",
      onClick: handleCancel,
      disabled: isPending,
      loading: isPending,
    });
  }

  return (
    <>
      <RecordActionBar
        title={invoiceNumber}
        backHref="/invoices"
        backLabel="請求書一覧に戻る"
        statusBadge={{
          label: statusLabels[status] ?? status,
          color: statusColors[status] ?? "#6b7280",
        }}
        primaryActions={primaryActions}
        secondaryActions={secondaryActions}
      />

      {/* 編集ダイアログ */}
      <InvoiceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        accounts={accounts}
        invoice={invoiceForEdit}
      />
    </>
  );
}
