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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/crud/form-field";
import { createVehicleClass, updateVehicleClass } from "@/app/actions/vehicle-class";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";

interface VehicleClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleClass?: {
    id: string;
    className: string;
    description: string | null;
    sortOrder: number;
  };
}

export function VehicleClassFormDialog({
  open,
  onOpenChange,
  vehicleClass,
}: VehicleClassFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!vehicleClass;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFieldErrors({});
      setErrorMessage(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (formData: FormData) => {
    setFieldErrors({});
    setErrorMessage(null);

    startTransition(async () => {
      let result: ActionResult;
      if (isEdit && vehicleClass) {
        result = await updateVehicleClass(vehicleClass.id, formData);
      } else {
        result = await createVehicleClass(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "車両クラスを更新しました" : "車両クラスを登録しました");
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
          <DialogTitle>{isEdit ? "車両クラスを編集" : "車両クラスを登録"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "車両クラスの情報を変更します。" : "新しい車両クラスを登録します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4">
          <FormField
            name="className"
            label="クラス名"
            type="text"
            required
            defaultValue={vehicleClass?.className}
            fieldErrors={fieldErrors.className}
            disabled={isPending}
          />

          <div className="grid gap-1.5">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={vehicleClass?.description ?? ""}
              disabled={isPending}
              rows={3}
              placeholder="車両クラスの説明（任意）"
            />
            {fieldErrors.description && fieldErrors.description.length > 0 && (
              <p className="text-destructive text-xs">{fieldErrors.description[0]}</p>
            )}
          </div>

          <FormField
            name="sortOrder"
            label="表示順"
            type="number"
            defaultValue={vehicleClass?.sortOrder ?? 0}
            fieldErrors={fieldErrors.sortOrder}
            disabled={isPending}
          />

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
