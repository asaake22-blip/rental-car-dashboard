"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteTerminal } from "@/app/actions/terminal";
import { toast } from "sonner";

interface TerminalDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminalId: string;
  terminalCode: string;
  /** true の場合、削除後に一覧へ遷移する */
  redirectToList?: boolean;
}

export function TerminalDeleteDialog({
  open,
  onOpenChange,
  terminalId,
  terminalCode,
  redirectToList = false,
}: TerminalDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteTerminal(terminalId);
      if (result.success) {
        toast.success("端末を削除しました");
        onOpenChange(false);
        if (redirectToList) {
          router.push("/terminals");
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
      title="端末を削除"
      description={`端末コード「${terminalCode}」を削除しますか？入金記録が紐付けられている場合は削除できません。`}
      actionLabel="削除"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
