"use client";

import { useTransition } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteRateOption } from "@/app/actions/rate-option";
import { toast } from "sonner";

interface RateOptionDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rateOptionId: string;
  rateOptionName: string;
}

export function RateOptionDeleteDialog({
  open,
  onOpenChange,
  rateOptionId,
  rateOptionName,
}: RateOptionDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteRateOption(rateOptionId);
      if (result.success) {
        toast.success("オプションを削除しました");
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
      title="オプションを削除"
      description={`「${rateOptionName}」を削除しますか？この操作は取り消せません。予約に紐づいている場合は削除できません。`}
      actionLabel="削除"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
