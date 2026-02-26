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
import { vehicleFormFields } from "@/lib/validations/vehicle";
import { createVehicle, updateVehicle } from "@/app/actions/vehicle";
import { getOfficeListForSelect } from "@/app/actions/office";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";
import type { VehicleRow } from "./columns";

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: VehicleRow;
}

export function VehicleFormDialog({ open, onOpenChange, vehicle }: VehicleFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [offices, setOffices] = useState<Array<{ id: string; officeName: string }>>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!vehicle;

  // ダイアログが開いたら営業所リストを取得
  useEffect(() => {
    if (open) {
      getOfficeListForSelect().then((list) => {
        setOffices(list as Array<{ id: string; officeName: string }>);
      });
    }
  }, [open]);

  const officeOptions = offices.map((o) => ({ value: o.id, label: o.officeName }));

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
      if (isEdit && vehicle) {
        result = await updateVehicle(vehicle.id, formData);
      } else {
        result = await createVehicle(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "車両データを更新しました" : "車両データを追加しました");
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "車両データを編集" : "車両データを追加"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "車両データの内容を変更します。" : "新しい車両データを登録します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {vehicleFormFields.map((field) => {
            // officeId フィールドは営業所 Select で表示
            if (field.name === "officeId") {
              return (
                <FormField
                  key={field.name}
                  name={field.name}
                  label="営業所"
                  type="select"
                  required={field.required}
                  defaultValue={vehicle ? vehicle.officeId : undefined}
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
                type={field.type as "text" | "number" | "select"}
                required={field.required}
                defaultValue={vehicle ? getFieldValue(vehicle, field.name) : undefined}
                options={field.type === "select" && "options" in field ? [...field.options] : undefined}
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
              {isPending ? "保存中..." : isEdit ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getFieldValue(vehicle: VehicleRow, fieldName: string): string | number {
  const value = vehicle[fieldName as keyof VehicleRow];
  if (value === null || value === undefined) return "";
  return value;
}
