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
import { FormField } from "@/components/crud/form-field";
import { inspectionFormFields } from "@/lib/validations/inspection";
import { createInspection, updateInspection } from "@/app/actions/inspection";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";
import type { InspectionRow } from "./columns";

interface InspectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection?: InspectionRow;
}

export function InspectionFormDialog({ open, onOpenChange, inspection }: InspectionFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!inspection;

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
      if (isEdit && inspection) {
        result = await updateInspection(inspection.id, formData);
      } else {
        result = await createInspection(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "点検記録を更新しました" : "点検記録を登録しました");
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
          <DialogTitle>{isEdit ? "点検記録を編集" : "点検記録を登録"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "点検記録の内容を変更します。" : "新しい点検・整備の予定を登録します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {inspectionFormFields.map((field) => (
            <FormField
              key={field.name}
              name={field.name}
              label={field.label}
              type={field.type as "text" | "number" | "date" | "select"}
              required={field.required}
              defaultValue={inspection ? getFieldValue(inspection, field.name) : undefined}
              options={field.type === "select" && "options" in field ? [...field.options] : undefined}
              fieldErrors={fieldErrors[field.name]}
              disabled={isPending}
            />
          ))}

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

function getFieldValue(inspection: InspectionRow, fieldName: string): string | number {
  const value = inspection[fieldName as keyof InspectionRow];
  if (value === null || value === undefined) return "";
  return value as string | number;
}
