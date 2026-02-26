"use client";

import { useTransition } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { cancelReservation } from "@/app/actions/reservation";
import { toast } from "sonner";

interface ReservationCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  reservationCode: string;
}

/**
 * 予約キャンセル確認ダイアログ
 */
export function ReservationCancelDialog({
  open,
  onOpenChange,
  reservationId,
  reservationCode,
}: ReservationCancelDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await cancelReservation(reservationId);
      if (result.success) {
        toast.success("予約をキャンセルしました");
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
      title="予約をキャンセル"
      description={`予約「${reservationCode}」をキャンセルしますか？この操作は取り消せません。`}
      actionLabel="キャンセルする"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
