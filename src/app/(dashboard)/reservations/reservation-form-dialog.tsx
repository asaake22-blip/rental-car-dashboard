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
import { createReservation, updateReservation } from "@/app/actions/reservation";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";

interface ReservationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleClasses: { id: string; className: string }[];
  offices: { id: string; officeName: string }[];
  reservation?: {
    id: string;
    vehicleClassId: string;
    customerName: string;
    customerNameKana: string;
    customerPhone: string;
    customerEmail: string | null;
    pickupDate: string; // ISO文字列
    returnDate: string; // ISO文字列
    pickupOfficeId: string;
    returnOfficeId: string;
    estimatedAmount: number | null;
    note: string | null;
    customerCode?: string | null;
    entityType?: number | null;
    companyCode?: string | null;
    channel?: string | null;
  };
}

/** datetime-local input 用のフォーマット（YYYY-MM-DDTHH:mm） */
function toDatetimeLocalValue(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  // ローカル時間に変換
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function ReservationFormDialog({
  open,
  onOpenChange,
  vehicleClasses,
  offices,
  reservation,
}: ReservationFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!reservation;

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
      if (isEdit && reservation) {
        result = await updateReservation(reservation.id, formData);
      } else {
        result = await createReservation(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "予約を更新しました" : "予約を登録しました");
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

  const vehicleClassOptions = vehicleClasses.map((vc) => ({
    value: vc.id,
    label: vc.className,
  }));

  const officeOptions = offices.map((o) => ({
    value: o.id,
    label: o.officeName,
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "予約を編集" : "新規予約"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "予約情報を変更します。" : "新しい予約を登録します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4">
          {/* 車両クラス */}
          <FormField
            name="vehicleClassId"
            label="車両クラス"
            type="select"
            required
            options={vehicleClassOptions}
            defaultValue={reservation?.vehicleClassId}
            fieldErrors={fieldErrors.vehicleClassId}
            disabled={isPending}
          />

          {/* 顧客情報 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="customerName"
              label="顧客名"
              type="text"
              required
              defaultValue={reservation?.customerName}
              fieldErrors={fieldErrors.customerName}
              disabled={isPending}
            />
            <FormField
              name="customerNameKana"
              label="顧客名（カナ）"
              type="text"
              required
              defaultValue={reservation?.customerNameKana}
              fieldErrors={fieldErrors.customerNameKana}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="customerPhone"
              label="電話番号"
              type="text"
              required
              defaultValue={reservation?.customerPhone}
              fieldErrors={fieldErrors.customerPhone}
              disabled={isPending}
            />
            <FormField
              name="customerEmail"
              label="メールアドレス"
              type="text"
              defaultValue={reservation?.customerEmail ?? ""}
              fieldErrors={fieldErrors.customerEmail}
              disabled={isPending}
            />
          </div>

          {/* 顧客区分・コード情報 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="customerCode"
              label="顧客コード"
              type="text"
              defaultValue={reservation?.customerCode ?? ""}
              fieldErrors={fieldErrors.customerCode}
              disabled={isPending}
            />
            <FormField
              name="entityType"
              label="個人/法人区分"
              type="select"
              options={[
                { value: "__none__", label: "未選択" },
                { value: "1", label: "個人" },
                { value: "2", label: "法人" },
              ]}
              defaultValue={reservation?.entityType != null ? String(reservation.entityType) : "__none__"}
              fieldErrors={fieldErrors.entityType}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="companyCode"
              label="法人コード"
              type="text"
              defaultValue={reservation?.companyCode ?? ""}
              fieldErrors={fieldErrors.companyCode}
              disabled={isPending}
            />
            <FormField
              name="channel"
              label="販売チャネル"
              type="text"
              defaultValue={reservation?.channel ?? ""}
              fieldErrors={fieldErrors.channel}
              disabled={isPending}
            />
          </div>

          {/* 日時 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pickupDate">
                出発日時
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="pickupDate"
                name="pickupDate"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocalValue(reservation?.pickupDate)}
                disabled={isPending}
              />
              {fieldErrors.pickupDate && fieldErrors.pickupDate.length > 0 && (
                <p className="text-destructive text-xs">{fieldErrors.pickupDate[0]}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="returnDate">
                帰着日時
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="returnDate"
                name="returnDate"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocalValue(reservation?.returnDate)}
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
              required
              options={officeOptions}
              defaultValue={reservation?.pickupOfficeId}
              fieldErrors={fieldErrors.pickupOfficeId}
              disabled={isPending}
            />
            <FormField
              name="returnOfficeId"
              label="帰着営業所"
              type="select"
              required
              options={officeOptions}
              defaultValue={reservation?.returnOfficeId}
              fieldErrors={fieldErrors.returnOfficeId}
              disabled={isPending}
            />
          </div>

          {/* 金額 */}
          <FormField
            name="estimatedAmount"
            label="見積金額"
            type="number"
            defaultValue={reservation?.estimatedAmount ?? ""}
            fieldErrors={fieldErrors.estimatedAmount}
            disabled={isPending}
          />

          {/* 備考 */}
          <div className="grid gap-1.5">
            <Label htmlFor="note">備考</Label>
            <Textarea
              id="note"
              name="note"
              defaultValue={reservation?.note ?? ""}
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
              {isPending ? "保存中..." : isEdit ? "更新" : "登録"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
