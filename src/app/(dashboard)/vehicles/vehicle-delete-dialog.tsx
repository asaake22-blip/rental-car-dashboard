"use client";

import { useTransition } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteVehicle } from "@/app/actions/vehicle";
import { toast } from "sonner";

interface VehicleDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleCode: string;
}

export function VehicleDeleteDialog({
  open,
  onOpenChange,
  vehicleId,
  vehicleCode,
}: VehicleDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteVehicle(vehicleId);
      if (result.success) {
        toast.success("車両データを削除しました");
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
      title="車両データを削除"
      description={`車両「${vehicleCode}」のデータを削除しますか？この操作は取り消せません。`}
      actionLabel="削除"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
