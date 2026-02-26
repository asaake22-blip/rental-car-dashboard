"use client";

import { useTransition } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteVehicleClass } from "@/app/actions/vehicle-class";
import { toast } from "sonner";

interface VehicleClassDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleClassId: string;
  vehicleClassName: string;
}

export function VehicleClassDeleteDialog({
  open,
  onOpenChange,
  vehicleClassId,
  vehicleClassName,
}: VehicleClassDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteVehicleClass(vehicleClassId);
      if (result.success) {
        toast.success("車両クラスを削除しました");
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
      title="車両クラスを削除"
      description={`「${vehicleClassName}」を削除しますか？この操作は取り消せません。車両が紐づいている場合は削除できません。`}
      actionLabel="削除"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
