"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { removeContractLine } from "@/app/actions/lease-contract";
import { toast } from "sonner";

interface RemoveLineButtonProps {
  contractId: string;
  lineId: string;
  vehicleCode: string;
}

export function RemoveLineButton({
  contractId,
  lineId,
  vehicleCode,
}: RemoveLineButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await removeContractLine(lineId);
      if (result.success) {
        toast.success("明細行を削除しました");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">明細を削除</span>
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="明細行を削除"
        description={`車両「${vehicleCode}」をこの契約から削除しますか？`}
        actionLabel="削除"
        onConfirm={handleConfirm}
        isPending={isPending}
        variant="destructive"
      />
    </>
  );
}
