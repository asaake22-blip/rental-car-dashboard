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
import { createPayment, updatePayment } from "@/app/actions/payment";
import { getTerminalListForSelect } from "@/app/actions/terminal";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";
import type { PaymentRow } from "./columns";

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: PaymentRow;
}

const categoryOptions = [
  { value: "BANK_TRANSFER", label: "銀行振込" },
  { value: "CASH", label: "現金" },
  { value: "CREDIT_CARD", label: "クレジットカード" },
  { value: "ELECTRONIC_MONEY", label: "電子マネー" },
  { value: "QR_PAYMENT", label: "QR決済" },
  { value: "CHECK", label: "小切手" },
  { value: "OTHER", label: "その他" },
] as const;

/** 端末が必要なカテゴリ */
const TERMINAL_CATEGORIES = ["CREDIT_CARD", "ELECTRONIC_MONEY", "QR_PAYMENT"];

type TerminalOption = {
  id: string;
  terminalName: string;
  terminalType: string;
  officeName: string | null;
};

export function PaymentFormDialog({
  open,
  onOpenChange,
  payment,
}: PaymentFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(
    payment?.paymentCategory ?? "BANK_TRANSFER"
  );
  const [terminals, setTerminals] = useState<TerminalOption[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!payment;

  const showTerminalField = TERMINAL_CATEGORIES.includes(category);

  // ダイアログが開いたら端末リストを取得
  useEffect(() => {
    if (open) {
      getTerminalListForSelect().then((list) => {
        setTerminals(list as TerminalOption[]);
      });
    }
  }, [open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setFieldErrors({});
        setErrorMessage(null);
        setCategory(payment?.paymentCategory ?? "BANK_TRANSFER");
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, payment]
  );

  const handleSubmit = (formData: FormData) => {
    setFieldErrors({});
    setErrorMessage(null);

    // 端末が不要なカテゴリの場合は terminalId をクリア
    if (!TERMINAL_CATEGORIES.includes(formData.get("paymentCategory") as string)) {
      formData.set("terminalId", "");
    }

    startTransition(async () => {
      let result: ActionResult;
      if (isEdit && payment) {
        result = await updatePayment(payment.id, formData);
      } else {
        result = await createPayment(formData);
      }

      if (result.success) {
        toast.success(
          isEdit ? "入金を更新しました" : "入金を登録しました"
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

  const terminalOptions = terminals.map((t) => ({
    value: t.id,
    label: `${t.terminalName}${t.officeName ? ` (${t.officeName})` : ""}`,
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "入金を編集" : "入金を登録"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "入金情報を変更します。"
              : "新しい入金を登録します。"}
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
              name="paymentDate"
              label="入金日"
              type="date"
              required
              defaultValue={
                payment?.paymentDate
                  ? payment.paymentDate.split("T")[0]
                  : ""
              }
              fieldErrors={fieldErrors.paymentDate}
              disabled={isPending}
            />
            <FormField
              name="amount"
              label="金額"
              type="number"
              required
              defaultValue={payment?.amount ?? ""}
              fieldErrors={fieldErrors.amount}
              disabled={isPending}
            />
            <FormField
              name="paymentCategory"
              label="カテゴリ"
              type="select"
              required
              defaultValue={payment?.paymentCategory ?? "BANK_TRANSFER"}
              options={[...categoryOptions]}
              fieldErrors={fieldErrors.paymentCategory}
              disabled={isPending}
              onValueChange={(_name, value) => setCategory(value)}
            />
            <FormField
              name="paymentProvider"
              label="プロバイダ"
              type="text"
              defaultValue={payment?.paymentProvider ?? ""}
              fieldErrors={fieldErrors.paymentProvider}
              disabled={isPending}
            />
            <FormField
              name="payerName"
              label="入金元名"
              type="text"
              required
              defaultValue={payment?.payerName ?? ""}
              fieldErrors={fieldErrors.payerName}
              disabled={isPending}
            />
            {showTerminalField && (
              <FormField
                name="terminalId"
                label="決済端末"
                type="select"
                defaultValue={payment?.terminalId ?? ""}
                options={[
                  { value: "", label: "選択なし" },
                  ...terminalOptions,
                ]}
                fieldErrors={fieldErrors.terminalId}
                disabled={isPending}
              />
            )}
            <FormField
              name="externalId"
              label="外部ID"
              type="text"
              defaultValue={payment?.externalId ?? ""}
              fieldErrors={fieldErrors.externalId}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="note">メモ</Label>
            <Textarea
              id="note"
              name="note"
              defaultValue={payment?.note ?? ""}
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
