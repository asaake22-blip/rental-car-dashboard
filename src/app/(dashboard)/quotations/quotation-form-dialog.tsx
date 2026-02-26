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
import { createQuotation, updateQuotation } from "@/app/actions/quotation";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";

interface QuotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; accountName: string }[];
  vehicleClasses: { id: string; className: string }[];
  offices: { id: string; officeName: string }[];
  quotation?: {
    id: string;
    accountId: string;
    title: string | null;
    customerName: string;
    vehicleClassId: string | null;
    pickupDate: string | null;
    returnDate: string | null;
    pickupOfficeId: string | null;
    returnOfficeId: string | null;
    validUntil: string | null;
    note: string | null;
    lines: {
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }[];
  };
}

/** datetime-local input 用のフォーマット（YYYY-MM-DDTHH:mm） */
function toDatetimeLocalValue(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

export function QuotationFormDialog({
  open,
  onOpenChange,
  accounts,
  vehicleClasses,
  offices,
  quotation,
}: QuotationFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState(quotation?.customerName ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!quotation;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFieldErrors({});
      setErrorMessage(null);
    }
    onOpenChange(nextOpen);
  };

  const handleAccountChange = (_name: string, value: string) => {
    // 取引先選択時に宛名を自動セット
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

      const pickupDateStr = formData.get("pickupDate") as string;
      const returnDateStr = formData.get("returnDate") as string;
      const validUntilStr = formData.get("validUntil") as string;

      const input = {
        accountId: formData.get("accountId") as string,
        title: (formData.get("title") as string) || null,
        customerName: formData.get("customerName") as string,
        vehicleClassId: (formData.get("vehicleClassId") as string) || null,
        pickupDate: pickupDateStr ? new Date(pickupDateStr) : null,
        returnDate: returnDateStr ? new Date(returnDateStr) : null,
        pickupOfficeId: (formData.get("pickupOfficeId") as string) || null,
        returnOfficeId: (formData.get("returnOfficeId") as string) || null,
        validUntil: validUntilStr ? new Date(validUntilStr) : null,
        note: (formData.get("note") as string) || null,
        lines,
      };

      let result: ActionResult;
      if (isEdit && quotation) {
        result = await updateQuotation(quotation.id, input);
      } else {
        result = await createQuotation(input);
      }

      if (result.success) {
        toast.success(isEdit ? "見積書を更新しました" : "見積書を作成しました");
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

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.accountName,
  }));

  const vehicleClassOptions = [
    { value: "__none__", label: "未選択" },
    ...vehicleClasses.map((vc) => ({
      value: vc.id,
      label: vc.className,
    })),
  ];

  const officeOptions = [
    { value: "__none__", label: "未選択" },
    ...offices.map((o) => ({
      value: o.id,
      label: o.officeName,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "見積書を編集" : "新規見積書"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "見積書情報を変更します。" : "新しい見積書を作成します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4">
          {/* 取引先 */}
          <FormField
            name="accountId"
            label="取引先"
            type="select"
            required
            options={accountOptions}
            defaultValue={quotation?.accountId}
            fieldErrors={fieldErrors.accountId}
            disabled={isPending}
            onValueChange={handleAccountChange}
          />

          {/* タイトル */}
          <FormField
            name="title"
            label="見積書タイトル"
            type="text"
            defaultValue={quotation?.title ?? ""}
            fieldErrors={fieldErrors.title}
            disabled={isPending}
          />

          {/* 宛名 */}
          <div className="grid gap-1.5">
            <Label htmlFor="customerName">
              宛名
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

          {/* 車両クラス */}
          <FormField
            name="vehicleClassId"
            label="車両クラス"
            type="select"
            options={vehicleClassOptions}
            defaultValue={quotation?.vehicleClassId ?? "__none__"}
            fieldErrors={fieldErrors.vehicleClassId}
            disabled={isPending}
          />

          {/* 日時 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pickupDate">出発日時</Label>
              <Input
                id="pickupDate"
                name="pickupDate"
                type="datetime-local"
                defaultValue={toDatetimeLocalValue(quotation?.pickupDate)}
                disabled={isPending}
              />
              {fieldErrors.pickupDate && fieldErrors.pickupDate.length > 0 && (
                <p className="text-destructive text-xs">{fieldErrors.pickupDate[0]}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="returnDate">帰着日時</Label>
              <Input
                id="returnDate"
                name="returnDate"
                type="datetime-local"
                defaultValue={toDatetimeLocalValue(quotation?.returnDate)}
                disabled={isPending}
              />
              {fieldErrors.returnDate && fieldErrors.returnDate.length > 0 && (
                <p className="text-destructive text-xs">{fieldErrors.returnDate[0]}</p>
              )}
            </div>
          </div>

          {/* 営業所 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="pickupOfficeId"
              label="出発営業所"
              type="select"
              options={officeOptions}
              defaultValue={quotation?.pickupOfficeId ?? "__none__"}
              fieldErrors={fieldErrors.pickupOfficeId}
              disabled={isPending}
            />
            <FormField
              name="returnOfficeId"
              label="帰着営業所"
              type="select"
              options={officeOptions}
              defaultValue={quotation?.returnOfficeId ?? "__none__"}
              fieldErrors={fieldErrors.returnOfficeId}
              disabled={isPending}
            />
          </div>

          {/* 有効期限 */}
          <div className="grid gap-1.5">
            <Label htmlFor="validUntil">有効期限</Label>
            <Input
              id="validUntil"
              name="validUntil"
              type="date"
              defaultValue={toDateValue(quotation?.validUntil)}
              disabled={isPending}
            />
            {fieldErrors.validUntil && fieldErrors.validUntil.length > 0 && (
              <p className="text-destructive text-xs">{fieldErrors.validUntil[0]}</p>
            )}
          </div>

          {/* 明細行 */}
          <LineItemsEditor
            name="lines"
            defaultLines={quotation?.lines}
            disabled={isPending}
          />

          {/* 備考 */}
          <div className="grid gap-1.5">
            <Label htmlFor="note">備考</Label>
            <Textarea
              id="note"
              name="note"
              defaultValue={quotation?.note ?? ""}
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
