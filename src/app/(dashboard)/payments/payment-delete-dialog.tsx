"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deletePayment } from "@/app/actions/payment";
import { toast } from "sonner";

interface PaymentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  paymentNumber: string;
  /** true の場合、削除後に一覧へ遷移する */
  redirectToList?: boolean;
}

export function PaymentDeleteDialog({
  open,
  onOpenChange,
  paymentId,
  paymentNumber,
  redirectToList = false,
}: PaymentDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deletePayment(paymentId);
      if (result.success) {
        toast.success("入金を削除しました");
        onOpenChange(false);
        if (redirectToList) {
          router.push("/payments");
        }
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="入金を削除"
      description={`入金番号「${paymentNumber}」を削除しますか？関連する消込データもすべて削除されます。この操作は取り消せません。`}
      actionLabel="削除"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
