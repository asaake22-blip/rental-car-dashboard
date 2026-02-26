"use client";

import { useTransition, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/crud/form-field";
import { createRateOption, updateRateOption } from "@/app/actions/rate-option";
import { toast } from "sonner";
type ActionResult = { success: true; data?: unknown } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

interface RateOptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rateOption?: {
    id: string;
    optionName: string;
    price: number;
    isActive: boolean;
  };
}

export function RateOptionFormDialog({
  open,
  onOpenChange,
  rateOption,
}: RateOptionFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(rateOption?.isActive ?? true);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!rateOption;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFieldErrors({});
      setErrorMessage(null);
      setIsActive(rateOption?.isActive ?? true);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (formData: FormData) => {
    setFieldErrors({});
    setErrorMessage(null);

    // Switch の値は formData に含まれないため手動追加
    formData.set("isActive", isActive ? "true" : "false");

    startTransition(async () => {
      let result: ActionResult;
      if (isEdit && rateOption) {
        result = await updateRateOption(rateOption.id, formData);
      } else {
        result = await createRateOption(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "オプションを更新しました" : "オプションを登録しました");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "オプションを編集" : "オプションを登録"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "オプションの情報を変更します。" : "新しい料金オプションを登録します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4">
          <FormField
            name="optionName"
            label="オプション名"
            type="text"
            required
            defaultValue={rateOption?.optionName}
            fieldErrors={fieldErrors.optionName}
            disabled={isPending}
          />

          <FormField
            name="price"
            label="料金"
            type="number"
            required
            defaultValue={rateOption?.price ?? 0}
            fieldErrors={fieldErrors.price}
            disabled={isPending}
          />

          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending}
            />
            <Label htmlFor="isActive">有効</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : isEdit ? "更新" : "登録"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
