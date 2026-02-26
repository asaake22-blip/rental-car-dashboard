"use client";

import { useTransition, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/crud/form-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateContractLine } from "@/app/actions/lease-contract";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";

interface EditLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineId: string;
  vehicleCode: string;
  initialData: {
    startDate: string;
    endDate: string;
    monthlyAmount: number;
    note: string | null;
  };
}

export function EditLineDialog({
  open,
  onOpenChange,
  lineId,
  vehicleCode,
  initialData,
}: EditLineDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setFieldErrors({});
        setErrorMessage(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const handleSubmit = (formData: FormData) => {
    setFieldErrors({});
    setErrorMessage(null);

    startTransition(async () => {
      const result: ActionResult = await updateContractLine(lineId, formData);

      if (result.success) {
        toast.success("明細を更新しました");
        handleOpenChange(false);
      } else {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        if (result.error) {
          setErrorMessage(result.error);
          toast.error(result.error);
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>明細を編集</DialogTitle>
          <DialogDescription>
            車両「{vehicleCode}」の明細情報を変更します。
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="startDate"
              label="開始日"
              type="date"
              required
              defaultValue={initialData.startDate}
              fieldErrors={fieldErrors.startDate}
              disabled={isPending}
            />
            <FormField
              name="endDate"
              label="終了日"
              type="date"
              required
              defaultValue={initialData.endDate}
              fieldErrors={fieldErrors.endDate}
              disabled={isPending}
            />
            <FormField
              name="monthlyAmount"
              label="月額"
              type="number"
              required
              defaultValue={String(initialData.monthlyAmount)}
              fieldErrors={fieldErrors.monthlyAmount}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="editLineNote">備考</Label>
            <Textarea
              id="editLineNote"
              name="note"
              defaultValue={initialData.note ?? ""}
              disabled={isPending}
            />
            {fieldErrors.note && (
              <p className="text-destructive text-xs">
                {fieldErrors.note[0]}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
