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
import { addContractLine } from "@/app/actions/lease-contract";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";

interface AddLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
}

export function AddLineDialog({
  open,
  onOpenChange,
  contractId,
}: AddLineDialogProps) {
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
      const result: ActionResult = await addContractLine(contractId, formData);

      if (result.success) {
        toast.success("車両を契約に追加しました");
        handleOpenChange(false);
        formRef.current?.reset();
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
          <DialogTitle>車両を追加</DialogTitle>
          <DialogDescription>
            契約に新しい車両（明細行）を追加します。
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
              name="vehicleId"
              label="車両ID"
              type="text"
              required
              fieldErrors={fieldErrors.vehicleId}
              disabled={isPending}
            />
            <FormField
              name="monthlyAmount"
              label="月額"
              type="number"
              required
              fieldErrors={fieldErrors.monthlyAmount}
              disabled={isPending}
            />
            <FormField
              name="startDate"
              label="開始日"
              type="date"
              required
              fieldErrors={fieldErrors.startDate}
              disabled={isPending}
            />
            <FormField
              name="endDate"
              label="終了日"
              type="date"
              required
              fieldErrors={fieldErrors.endDate}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lineNote">備考</Label>
            <Textarea
              id="lineNote"
              name="note"
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
              {isPending ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
