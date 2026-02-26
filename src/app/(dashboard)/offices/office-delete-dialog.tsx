"use client";

import { useTransition } from "react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteOffice } from "@/app/actions/office";
import { toast } from "sonner";

interface OfficeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officeId: string;
  officeName: string;
}

export function OfficeDeleteDialog({
  open,
  onOpenChange,
  officeId,
  officeName,
}: OfficeDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteOffice(officeId);
      if (result.success) {
        toast.success("営業所を削除しました");
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
      title="営業所を削除"
      description={`「${officeName}」を削除しますか？この操作は取り消せません。車両や駐車場が紐づいている場合は削除できません。`}
      actionLabel="削除"
      onConfirm={handleConfirm}
      isPending={isPending}
      variant="destructive"
    />
  );
}
