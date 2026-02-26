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
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/crud/form-field";
import { LineItemsEditor } from "@/components/line-items/line-items-editor";
import { createInvoice, updateInvoice } from "@/app/actions/invoice";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts?: { id: string; accountName: string }[];
  settledReservations?: { id: string; reservationCode: string; customerName: string }[];
  invoice?: {
    id: string;
    accountId: string | null;
    customerName: string;
    customerCode: string | null;
    companyCode: string | null;
    issueDate: string;
    dueDate: string;
    amount: number;
    taxAmount: number;
    totalAmount: number;
    note: string | null;
    lines: { description: string; quantity: number; unitPrice: number; taxRate: number }[];
  };
}

/** date input 用のフォーマット（YYYY-MM-DD） */
function toDateValue(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  accounts = [],
  settledReservations = [],
  invoice,
}: InvoiceFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState(invoice?.customerName ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!invoice;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFieldErrors({});
      setErrorMessage(null);
    }
    onOpenChange(nextOpen);
  };

  const handleAccountChange = (_name: string, value: string) => {
    // 取引先選択時に顧客名を自動セット
    if (value === "__none__") return;
    const selected = accounts.find((a) => a.id === value);
    if (selected) {
      setCustomerName(selected.accountName);
    }
  };

  const handleSubmit = (formData: FormData) => {
    setFieldErrors({});
    setErrorMessage(null);

    startTransition(async () => {
      // 明細行を JSON から取得
      const linesJson = formData.get("lines") as string;
      let lines: { description: string; quantity: number; unitPrice: number; taxRate: number }[] = [];
      try {
        lines = JSON.parse(linesJson || "[]");
      } catch {
        // パースエラー時は空配列
      }

      // 明細行から金額自動計算
      const calcAmount = lines.reduce((s, l) => s + Math.floor(l.quantity * l.unitPrice), 0);
      const calcTax = lines.reduce((s, l) => s + Math.floor(Math.floor(l.quantity * l.unitPrice) * l.taxRate), 0);

      const rawAccountId = (formData.get("accountId") as string) || null;
      const accountId = rawAccountId === "__none__" ? null : rawAccountId;

      const input = {
        reservationId: formData.get("reservationId") as string,
        customerName: formData.get("customerName") as string,
        customerCode: (formData.get("customerCode") as string) || null,
        companyCode: (formData.get("companyCode") as string) || null,
        accountId,
        issueDate: new Date(formData.get("issueDate") as string),
        dueDate: new Date(formData.get("dueDate") as string),
        amount: calcAmount,
        taxAmount: calcTax,
        totalAmount: calcAmount + calcTax,
        note: (formData.get("note") as string) || null,
        lines,
      };

      let result: ActionResult;
      if (isEdit && invoice) {
        result = await updateInvoice(invoice.id, input);
      } else {
        result = await createInvoice(input);
      }

      if (result.success) {
        toast.success(isEdit ? "請求書を更新しました" : "請求書を作成しました");
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

  const reservationOptions = settledReservations.map((r) => ({
    value: r.id,
    label: `${r.reservationCode} - ${r.customerName}`,
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "請求書を編集" : "新規請求書"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "請求書情報を変更します。" : "新しい請求書を作成します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4">
          {/* 予約選択（作成時のみ） */}
          {!isEdit && reservationOptions.length > 0 && (
            <FormField
              name="reservationId"
              label="予約"
              type="select"
              required
              options={reservationOptions}
              fieldErrors={fieldErrors.reservationId}
              disabled={isPending}
            />
          )}

          {/* 取引先 */}
          {accounts.length > 0 && (
            <FormField
              name="accountId"
              label="取引先"
              type="select"
              options={[
                { value: "__none__", label: "選択なし" },
                ...accounts.map((a) => ({ value: a.id, label: a.accountName })),
              ]}
              defaultValue={invoice?.accountId ?? "__none__"}
              fieldErrors={fieldErrors.accountId}
              disabled={isPending}
              onValueChange={handleAccountChange}
            />
          )}

          {/* 顧客名 */}
          <div className="grid gap-1.5">
            <Label htmlFor="customerName">
              顧客名
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="customerName"
              name="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              disabled={isPending}
            />
            {fieldErrors.customerName && fieldErrors.customerName.length > 0 && (
              <p className="text-destructive text-xs">{fieldErrors.customerName[0]}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="customerCode"
              label="顧客コード"
              type="text"
              defaultValue={invoice?.customerCode ?? ""}
              fieldErrors={fieldErrors.customerCode}
              disabled={isPending}
            />
            <FormField
              name="companyCode"
              label="法人コード"
              type="text"
              defaultValue={invoice?.companyCode ?? ""}
              fieldErrors={fieldErrors.companyCode}
              disabled={isPending}
            />
          </div>

          {/* 日付 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="issueDate">
                発行日
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="issueDate"
                name="issueDate"
                type="date"
                required
                defaultValue={toDateValue(invoice?.issueDate)}
                disabled={isPending}
              />
              {fieldErrors.issueDate && fieldErrors.issueDate.length > 0 && (
                <p className="text-destructive text-xs">{fieldErrors.issueDate[0]}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dueDate">
                支払期日
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                required
                defaultValue={toDateValue(invoice?.dueDate)}
                disabled={isPending}
              />
              {fieldErrors.dueDate && fieldErrors.dueDate.length > 0 && (
                <p className="text-destructive text-xs">{fieldErrors.dueDate[0]}</p>
              )}
            </div>
          </div>

          {/* 明細行 */}
          <LineItemsEditor
            name="lines"
            defaultLines={invoice?.lines}
            disabled={isPending}
          />

          {/* 備考 */}
          <div className="grid gap-1.5">
            <Label htmlFor="note">備考</Label>
            <Textarea
              id="note"
              name="note"
              defaultValue={invoice?.note ?? ""}
              disabled={isPending}
              rows={3}
              placeholder="備考（任意）"
            />
            {fieldErrors.note && fieldErrors.note.length > 0 && (
              <p className="text-destructive text-xs">{fieldErrors.note[0]}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : isEdit ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
