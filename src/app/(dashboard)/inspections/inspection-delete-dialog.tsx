"use client";

import { useTransition } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteInspection } from "@/app/actions/inspection";
import { toast } from "sonner";

const typeLabel: Record<string, string> = {
  REGULAR: "定期点検",
  LEGAL: "法令点検",
  SHAKEN: "車検",
  MAINTENANCE: "整備",
};

interface InspectionDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectionId: string;
  vehicleCode: string;
  inspectionType: string;
}

export function InspectionDeleteDialog({
  open,
  onOpenChange,
  inspectionId,
  vehicleCode,
  inspectionType,
}: InspectionDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteInspection(inspectionId);
      if (result.success) {
        toast.success("点検記録を削除しました");
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
      title="点検記録を削除"
      description={`「${vehicleCode}」の${typeLabel[inspectionType] ?? inspectionType}記録を削除しますか？この操作は取り消せません。`}
      actionLabel="削除"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
