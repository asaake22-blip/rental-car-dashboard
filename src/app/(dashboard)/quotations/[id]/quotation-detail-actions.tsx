"use client";

/**
 * 見積書詳細ページのアクション（RecordActionBar + ステータス遷移ダイアログ）
 *
 * ステータスに応じてアクションボタンを表示:
 * - DRAFT: 送付（primary）、編集（secondary）、削除（destructive）
 * - SENT: 承諾（primary）、編集（secondary）、不成立（secondary）
 * - ACCEPTED: 予約変換（primary）
 * - EXPIRED/REJECTED: アクションなし
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Send,
  Check,
  XCircle,
  Trash2,
  CalendarDays,
} from "lucide-react";
import {
  RecordActionBar,
  type Action,
} from "@/components/record-detail/record-action-bar";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { QuotationFormDialog } from "../quotation-form-dialog";
import {
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  deleteQuotation,
  convertQuotationToReservation,
} from "@/app/actions/quotation";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  DRAFT: "下書き",
  SENT: "送付済",
  ACCEPTED: "承諾",
  EXPIRED: "期限切",
  REJECTED: "不成立",
};

const statusColors: Record<string, string> = {
  DRAFT: "#6b7280",    // gray
  SENT: "#3b82f6",     // blue
  ACCEPTED: "#22c55e", // green
  EXPIRED: "#eab308",  // yellow
  REJECTED: "#ef4444", // red
};

interface QuotationDetailActionsProps {
  id: string;
  quotationCode: string;
  status: string;
  reservationId: string | null;
  accounts: { id: string; accountName: string }[];
  vehicleClasses: { id: string; className: string }[];
  offices: { id: string; officeName: string }[];
  quotationForEdit: {
    id: string;
    accountId: string;
    title: string | null;
    customerName: string;
    vehicleClassId: string | null;
    pickupDate: string | null;
    returnDate: string | null;
    pickupOfficeId: string | null;
    returnOfficeId: string | null;
    validUntil: string | null;
    note: string | null;
    lines: {
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }[];
  };
}

export function QuotationDetailActions({
  id,
  quotationCode,
  status,
  reservationId,
  accounts,
  vehicleClasses,
  offices,
  quotationForEdit,
}: QuotationDetailActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canEdit = status === "DRAFT" || status === "SENT";
  const canSend = status === "DRAFT";
  const canAccept = status === "SENT";
  const canReject = status === "SENT";
  const canDelete = status === "DRAFT";
  const canConvert = status === "ACCEPTED" && !reservationId;

  const handleSend = () => {
    startTransition(async () => {
      const result = await sendQuotation(id);
      if (result.success) {
        toast.success("見積書を送付しました");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptQuotation(id);
      if (result.success) {
        toast.success("見積書を承諾しました");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectQuotation(id);
      if (result.success) {
        toast.success("見積書を不成立にしました");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteQuotation(id);
      if (result.success) {
        toast.success("見積書を削除しました");
        router.push("/quotations");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleConvert = () => {
    startTransition(async () => {
      const result = await convertQuotationToReservation(id);
      if (result.success) {
        toast.success("見積書を予約に変換しました");
        setConvertOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  // --- アクション配列の構築 ---
  const primaryActions: Action[] = [];
  const secondaryActions: Action[] = [];

  // DRAFT: 送付 → primary
  if (canSend) {
    primaryActions.push({
      key: "send",
      label: "送付",
      icon: Send,
      variant: "default",
      onClick: handleSend,
      loading: isPending,
      disabled: isPending,
    });
  }

  // SENT: 承諾 → primary
  if (canAccept) {
    primaryActions.push({
      key: "accept",
      label: "承諾",
      icon: Check,
      variant: "default",
      onClick: handleAccept,
      loading: isPending,
      disabled: isPending,
    });
  }

  // ACCEPTED: 予約変換 → primary
  if (canConvert) {
    primaryActions.push({
      key: "convert",
      label: "予約に変換",
      icon: CalendarDays,
      variant: "default",
      onClick: () => setConvertOpen(true),
      disabled: isPending,
    });
  }

  // DRAFT / SENT: 編集 → secondary
  if (canEdit) {
    secondaryActions.push({
      key: "edit",
      label: "編集",
      icon: Pencil,
      variant: "outline",
      onClick: () => setEditOpen(true),
      disabled: isPending,
    });
  }

  // SENT: 不成立 → secondary
  if (canReject) {
    secondaryActions.push({
      key: "reject",
      label: "不成立",
      icon: XCircle,
      variant: "outline",
      onClick: handleReject,
      loading: isPending,
      disabled: isPending,
    });
  }

  // DRAFT: 削除 → destructiveAction
  const destructiveAction: Action | undefined = canDelete
    ? {
        key: "delete",
        label: "削除",
        icon: Trash2,
        variant: "destructive",
        onClick: () => setDeleteOpen(true),
        disabled: isPending,
      }
    : undefined;

  return (
    <>
      <RecordActionBar
        title={quotationCode}
        backHref="/quotations"
        backLabel="見積書一覧に戻る"
        statusBadge={{
          label: statusLabels[status] ?? status,
          color: statusColors[status] ?? "#6b7280",
        }}
        primaryActions={primaryActions}
        secondaryActions={secondaryActions}
        destructiveAction={destructiveAction}
      />

      {/* 編集ダイアログ */}
      <QuotationFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        accounts={accounts}
        vehicleClasses={vehicleClasses}
        offices={offices}
        quotation={quotationForEdit}
      />

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="見積書の削除"
        description={`見積書「${quotationCode}」を削除しますか？この操作は取り消せません。`}
        actionLabel="削除"
        onConfirm={handleDelete}
        isPending={isPending}
      />

      {/* 予約変換確認ダイアログ */}
      <ConfirmDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="予約に変換"
        description={`見積書「${quotationCode}」の内容で予約を作成しますか？車両クラス・出発/帰着日時・営業所の情報が必要です。`}
        actionLabel="予約に変換"
        onConfirm={handleConvert}
        isPending={isPending}
        variant="default"
      />
    </>
  );
}
