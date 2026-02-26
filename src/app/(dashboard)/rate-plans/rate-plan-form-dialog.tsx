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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/crud/form-field";
import { createRatePlan, updateRatePlan } from "@/app/actions/rate-plan";
import { toast } from "sonner";
type ActionResult = { success: true; data?: unknown } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

interface RatePlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleClasses: { id: string; className: string }[];
  ratePlan?: {
    id: string;
    planName: string;
    vehicleClassId: string;
    rateType: "HOURLY" | "DAILY" | "OVERNIGHT";
    basePrice: number;
    additionalHourPrice: number;
    insurancePrice: number;
    validFrom: string;
    validTo: string | null;
    isActive: boolean;
  };
}

const rateTypeOptions = [
  { value: "HOURLY", label: "時間制" },
  { value: "DAILY", label: "日割" },
  { value: "OVERNIGHT", label: "泊数制" },
] as const;

export function RatePlanFormDialog({
  open,
  onOpenChange,
  vehicleClasses,
  ratePlan,
}: RatePlanFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(ratePlan?.isActive ?? true);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!ratePlan;

  const vehicleClassOptions = vehicleClasses.map((vc) => ({
    value: vc.id,
    label: vc.className,
  }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFieldErrors({});
      setErrorMessage(null);
      setIsActive(ratePlan?.isActive ?? true);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (formData: FormData) => {
    setFieldErrors({});
    setErrorMessage(null);

    // Switch の値は formData に含まれないため手動追加
    formData.set("isActive", isActive ? "true" : "false");

    startTransition(async () => {
      let result: ActionResult;
      if (isEdit && ratePlan) {
        result = await updateRatePlan(ratePlan.id, formData);
      } else {
        result = await createRatePlan(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "料金プランを更新しました" : "料金プランを登録しました");
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
          <DialogTitle>{isEdit ? "料金プランを編集" : "料金プランを登録"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "料金プランの情報を変更します。" : "新しい料金プランを登録します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4">
          <FormField
            name="planName"
            label="プラン名"
            type="text"
            required
            defaultValue={ratePlan?.planName}
            fieldErrors={fieldErrors.planName}
            disabled={isPending}
          />

          <FormField
            name="vehicleClassId"
            label="車両クラス"
            type="select"
            required
            options={vehicleClassOptions}
            defaultValue={ratePlan?.vehicleClassId}
            fieldErrors={fieldErrors.vehicleClassId}
            disabled={isPending}
          />

          <FormField
            name="rateType"
            label="料金タイプ"
            type="select"
            required
            options={[...rateTypeOptions]}
            defaultValue={ratePlan?.rateType ?? "DAILY"}
            fieldErrors={fieldErrors.rateType}
            disabled={isPending}
          />

          <div className="grid grid-cols-3 gap-3">
            <FormField
              name="basePrice"
              label="基本料金"
              type="number"
              required
              defaultValue={ratePlan?.basePrice ?? 0}
              fieldErrors={fieldErrors.basePrice}
              disabled={isPending}
            />

            <FormField
              name="additionalHourPrice"
              label="超過料金/h"
              type="number"
              defaultValue={ratePlan?.additionalHourPrice ?? 0}
              fieldErrors={fieldErrors.additionalHourPrice}
              disabled={isPending}
            />

            <FormField
              name="insurancePrice"
              label="免責補償料/日"
              type="number"
              defaultValue={ratePlan?.insurancePrice ?? 0}
              fieldErrors={fieldErrors.insurancePrice}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              name="validFrom"
              label="有効開始日"
              type="date"
              required
              defaultValue={ratePlan?.validFrom}
              fieldErrors={fieldErrors.validFrom}
              disabled={isPending}
            />

            <FormField
              name="validTo"
              label="有効終了日"
              type="date"
              defaultValue={ratePlan?.validTo ?? ""}
              fieldErrors={fieldErrors.validTo}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending}
            />
            <Label htmlFor="isActive">有効</Label>
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
