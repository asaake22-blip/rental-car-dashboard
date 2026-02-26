"use client";

/**
 * 取引先詳細ページのアクション（RecordActionBar + 編集・削除ダイアログ）
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { RecordActionBar } from "@/components/record-detail/record-action-bar";
import { AccountFormDialog } from "../account-form-dialog";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteAccount } from "@/app/actions/account";
import { toast } from "sonner";

interface AccountDetailActionsProps {
  id: string;
  accountCode: string;
  accountName: string;
  accountForEdit: {
    id: string;
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
  };
}

export function AccountDetailActions({
  id,
  accountCode,
  accountName,
  accountForEdit,
}: AccountDetailActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteAccount(id);
      if (result.success) {
        toast.success("取引先を削除しました");
        router.push("/accounts");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <RecordActionBar
        title={accountCode}
        subtitle={accountName}
        backHref="/accounts"
        backLabel="取引先一覧に戻る"
        primaryActions={[
          {
            key: "edit",
            label: "編集",
            icon: Pencil,
            variant: "outline",
            onClick: () => setEditOpen(true),
            disabled: isPending,
          },
        ]}
        destructiveAction={{
          key: "delete",
          label: "削除",
          icon: Trash2,
          variant: "destructive",
          onClick: () => setDeleteOpen(true),
          disabled: isPending,
        }}
      />

      <AccountFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        account={accountForEdit}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="取引先の削除"
        description={`取引先「${accountName}」を削除しますか？関連する見積書・請求書・予約がある場合は削除できません。`}
        actionLabel="削除"
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </>
  );
}
