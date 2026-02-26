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
import { updateLeaseContract } from "@/app/actions/lease-contract";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";

interface ContractEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  contractNumber: string;
  /** 編集用の初期値。省略時は空欄で表示 */
  initialData?: {
    lesseeType: string;
    lesseeName: string;
    lesseeCompanyCode: string | null;
    externalId: string | null;
    startDate: string;
    endDate: string;
    note: string | null;
  };
}

const lesseeTypeOptions = [
  { value: "INDIVIDUAL", label: "個人" },
  { value: "CORPORATE", label: "法人" },
] as const;

export function ContractEditDialog({
  open,
  onOpenChange,
  contractId,
  contractNumber,
  initialData,
}: ContractEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lesseeType, setLesseeType] = useState<string>(
    initialData?.lesseeType ?? "INDIVIDUAL"
  );
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
      const result: ActionResult = await updateLeaseContract(
        contractId,
        formData
      );

      if (result.success) {
        toast.success("リース契約を更新しました");
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>リース契約を編集</DialogTitle>
          <DialogDescription>
            契約番号「{contractNumber}」のヘッダー情報を変更します。
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
              name="lesseeType"
              label="区分"
              type="select"
              required
              defaultValue={initialData?.lesseeType ?? "INDIVIDUAL"}
              options={[...lesseeTypeOptions]}
              fieldErrors={fieldErrors.lesseeType}
              disabled={isPending}
              onValueChange={(_name, value) => setLesseeType(value)}
            />
            <FormField
              name="lesseeName"
              label="リース先名称"
              type="text"
              required
              defaultValue={initialData?.lesseeName ?? ""}
              fieldErrors={fieldErrors.lesseeName}
              disabled={isPending}
            />
            {lesseeType === "CORPORATE" && (
              <FormField
                name="lesseeCompanyCode"
                label="会社コード"
                type="text"
                defaultValue={initialData?.lesseeCompanyCode ?? ""}
                fieldErrors={fieldErrors.lesseeCompanyCode}
                disabled={isPending}
              />
            )}
            <FormField
              name="externalId"
              label="外部ID"
              type="text"
              defaultValue={initialData?.externalId ?? ""}
              fieldErrors={fieldErrors.externalId}
              disabled={isPending}
            />
            <FormField
              name="startDate"
              label="契約開始日"
              type="date"
              required
              defaultValue={initialData?.startDate ?? ""}
              fieldErrors={fieldErrors.startDate}
              disabled={isPending}
            />
            <FormField
              name="endDate"
              label="契約終了日"
              type="date"
              required
              defaultValue={initialData?.endDate ?? ""}
              fieldErrors={fieldErrors.endDate}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="note">備考</Label>
            <Textarea
              id="note"
              name="note"
              defaultValue={initialData?.note ?? ""}
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
