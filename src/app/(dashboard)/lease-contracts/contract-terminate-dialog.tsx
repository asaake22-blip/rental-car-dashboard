"use client";

import { useTransition } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { terminateLeaseContract } from "@/app/actions/lease-contract";
import { toast } from "sonner";

interface ContractTerminateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  contractNumber: string;
}

export function ContractTerminateDialog({
  open,
  onOpenChange,
  contractId,
  contractNumber,
}: ContractTerminateDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await terminateLeaseContract(contractId);
      if (result.success) {
        toast.success("リース契約を解約しました");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="リース契約を解約"
      description={`契約番号「${contractNumber}」を解約しますか？この操作は取り消せません。`}
      actionLabel="解約"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
