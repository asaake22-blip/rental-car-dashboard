"use client";

import { useTransition } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteRatePlan } from "@/app/actions/rate-plan";
import { toast } from "sonner";

interface RatePlanDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ratePlanId: string;
  ratePlanName: string;
}

export function RatePlanDeleteDialog({
  open,
  onOpenChange,
  ratePlanId,
  ratePlanName,
}: RatePlanDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteRatePlan(ratePlanId);
      if (result.success) {
        toast.success("料金プランを削除しました");
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
      title="料金プランを削除"
      description={`「${ratePlanName}」を削除しますか？この操作は取り消せません。`}
      actionLabel="削除"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
