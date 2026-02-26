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
import { officeFormFields } from "@/lib/validations/office";
import { createOffice, updateOffice } from "@/app/actions/office";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";

interface OfficeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  office?: {
    id: string;
    officeName: string;
    area: string | null;
  };
}

export function OfficeFormDialog({ open, onOpenChange, office }: OfficeFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!office;

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
      if (isEdit && office) {
        result = await updateOffice(office.id, formData);
      } else {
        result = await createOffice(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "営業所を更新しました" : "営業所を登録しました");
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
          <DialogTitle>{isEdit ? "営業所を編集" : "営業所を登録"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "営業所の情報を変更します。" : "新しい営業所を登録します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {officeFormFields.map((field) => (
            <FormField
              key={field.name}
              name={field.name}
              label={field.label}
              type={field.type as "text"}
              required={field.required}
              defaultValue={office ? getFieldValue(office, field.name) : undefined}
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

function getFieldValue(
  office: { officeName: string; area: string | null },
  fieldName: string,
): string {
  const map: Record<string, string> = {
    officeName: office.officeName,
    area: office.area ?? "",
  };
  return map[fieldName] ?? "";
}
