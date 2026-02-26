"use client";

import { useTransition, useRef, useState, useEffect } from "react";
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
import { parkingLotFormFields } from "@/lib/validations/parking";
import { createParkingLot, updateParkingLot } from "@/app/actions/parking";
import { getOfficeListForSelect } from "@/app/actions/office";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";

interface ParkingLotFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot?: {
    id: string;
    name: string;
    officeId: string;
    canvasWidth: number;
    canvasHeight: number;
  };
}

export function ParkingLotFormDialog({ open, onOpenChange, lot }: ParkingLotFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [offices, setOffices] = useState<Array<{ id: string; officeName: string }>>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!lot;

  // ダイアログが開いたら営業所リストを取得
  useEffect(() => {
    if (open) {
      getOfficeListForSelect().then((list) => {
        setOffices(list as Array<{ id: string; officeName: string }>);
      });
    }
  }, [open]);

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
      if (isEdit && lot) {
        result = await updateParkingLot(lot.id, formData);
      } else {
        result = await createParkingLot(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "駐車場を更新しました" : "駐車場を登録しました");
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

  const officeOptions = offices.map((o) => ({ value: o.id, label: o.officeName }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "駐車場を編集" : "駐車場を登録"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "駐車場の情報を変更します。" : "新しい駐車場を登録します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {parkingLotFormFields.map((field) => {
            // officeId フィールドは Select で表示
            if (field.name === "officeId") {
              return (
                <FormField
                  key={field.name}
                  name={field.name}
                  label="営業所"
                  type="select"
                  required={field.required}
                  defaultValue={lot ? lot.officeId : undefined}
                  options={officeOptions}
                  fieldErrors={fieldErrors[field.name]}
                  disabled={isPending}
                />
              );
            }
            return (
              <FormField
                key={field.name}
                name={field.name}
                label={field.label}
                type={field.type as "text" | "number"}
                required={field.required}
                defaultValue={lot ? getLotFieldValue(lot, field.name) : undefined}
                fieldErrors={fieldErrors[field.name]}
                disabled={isPending}
              />
            );
          })}

          <DialogFooter className="sm:col-span-2">
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

function getLotFieldValue(
  lot: { name: string; officeId: string; canvasWidth: number; canvasHeight: number },
  fieldName: string,
): string | number {
  const map: Record<string, string | number> = {
    officeId: lot.officeId,
    name: lot.name,
    canvasWidth: lot.canvasWidth,
    canvasHeight: lot.canvasHeight,
  };
  return map[fieldName] ?? "";
}
