"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteLeaseContract } from "@/app/actions/lease-contract";
import { toast } from "sonner";

interface ContractDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  contractNumber: string;
}

export function ContractDeleteDialog({
  open,
  onOpenChange,
  contractId,
  contractNumber,
}: ContractDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteLeaseContract(contractId);
      if (result.success) {
        toast.success("リース契約を削除しました");
        onOpenChange(false);
        router.push("/lease-contracts");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="リース契約を削除"
      description={`契約番号「${contractNumber}」を削除しますか？関連する契約明細もすべて削除されます。この操作は取り消せません。`}
      actionLabel="削除"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
