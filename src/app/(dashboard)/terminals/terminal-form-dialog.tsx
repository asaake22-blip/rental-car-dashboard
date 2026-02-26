"use client";

import { useTransition, useRef, useState, useCallback, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createTerminal, updateTerminal } from "@/app/actions/terminal";
import { getOfficeListForSelect } from "@/app/actions/office";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";
import type { TerminalRow } from "./columns";

interface TerminalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminal?: TerminalRow;
}

const typeOptions = [
  { value: "CREDIT_CARD", label: "クレジットカード" },
  { value: "ELECTRONIC_MONEY", label: "電子マネー" },
  { value: "QR_PAYMENT", label: "QR決済" },
  { value: "MULTI", label: "マルチ決済" },
] as const;

const statusOptions = [
  { value: "ACTIVE", label: "稼働中" },
  { value: "INACTIVE", label: "停止中" },
  { value: "MAINTENANCE", label: "メンテナンス中" },
] as const;

export function TerminalFormDialog({
  open,
  onOpenChange,
  terminal,
}: TerminalFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [offices, setOffices] = useState<
    Array<{ id: string; officeName: string }>
  >([]);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!terminal;

  // ダイアログが開いたら営業所リストを取得
  useEffect(() => {
    if (open) {
      getOfficeListForSelect().then((list) => {
        setOffices(list as Array<{ id: string; officeName: string }>);
      });
    }
  }, [open]);

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
      let result: ActionResult;
      if (isEdit && terminal) {
        result = await updateTerminal(terminal.id, formData);
      } else {
        result = await createTerminal(formData);
      }

      if (result.success) {
        toast.success(
          isEdit ? "端末を更新しました" : "端末を登録しました"
        );
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

  const officeOptions = offices.map((o) => ({
    value: o.id,
    label: o.officeName,
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "端末を編集" : "端末を登録"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "端末の情報を変更します。"
              : "新しい決済端末を登録します。"}
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
              name="terminalName"
              label="名称"
              type="text"
              required
              defaultValue={terminal?.terminalName ?? ""}
              fieldErrors={fieldErrors.terminalName}
              disabled={isPending}
            />
            <FormField
              name="terminalType"
              label="種別"
              type="select"
              required
              defaultValue={terminal?.terminalType ?? "MULTI"}
              options={[...typeOptions]}
              fieldErrors={fieldErrors.terminalType}
              disabled={isPending}
            />
            <FormField
              name="provider"
              label="プロバイダ"
              type="text"
              defaultValue={terminal?.provider ?? ""}
              fieldErrors={fieldErrors.provider}
              disabled={isPending}
            />
            <FormField
              name="modelName"
              label="機種名"
              type="text"
              defaultValue={terminal?.modelName ?? ""}
              fieldErrors={fieldErrors.modelName}
              disabled={isPending}
            />
            <FormField
              name="serialNumber"
              label="シリアル番号"
              type="text"
              defaultValue={terminal?.serialNumber ?? ""}
              fieldErrors={fieldErrors.serialNumber}
              disabled={isPending}
            />
            {officeOptions.length > 0 && (
              <FormField
                name="officeId"
                label="営業所"
                type="select"
                required
                defaultValue={terminal?.officeId ?? officeOptions[0]?.value ?? ""}
                options={officeOptions}
                fieldErrors={fieldErrors.officeId}
                disabled={isPending}
              />
            )}
            {isEdit && (
              <FormField
                name="status"
                label="ステータス"
                type="select"
                defaultValue={terminal?.status ?? "ACTIVE"}
                options={[...statusOptions]}
                fieldErrors={fieldErrors.status}
                disabled={isPending}
              />
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="note">メモ</Label>
            <Textarea
              id="note"
              name="note"
              defaultValue={terminal?.note ?? ""}
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
              {isPending ? "保存中..." : isEdit ? "更新" : "登録"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
