"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteParkingLot } from "@/app/actions/parking";
import { toast } from "sonner";

interface ParkingLotDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotId: string;
  lotName: string;
}

export function ParkingLotDeleteDialog({
  open,
  onOpenChange,
  lotId,
  lotName,
}: ParkingLotDeleteDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteParkingLot(lotId);
      if (result.success) {
        toast.success("駐車場を削除しました");
        onOpenChange(false);
        router.push("/parking");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="駐車場を削除"
      description={`「${lotName}」を削除しますか？すべての区画データも削除されます。この操作は取り消せません。`}
      actionLabel="削除"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
