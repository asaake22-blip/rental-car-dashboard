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
import { createAccount, updateAccount } from "@/app/actions/account";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: {
    id: string;
    accountName: string;
    accountNameKana: string | null;
    accountType: string;
    closingDay: number | null;
    paymentMonthOffset: number | null;
    paymentDay: number | null;
    paymentTermsLabel: string | null;
    zipCode: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    mfPartnerId: string | null;
    mfPartnerCode: string | null;
    legacyCompanyCode: string | null;
  };
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: AccountFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!account;

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
      if (isEdit && account) {
        result = await updateAccount(account.id, formData);
      } else {
        result = await createAccount(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "取引先を更新しました" : "取引先を登録しました");
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "取引先を編集" : "新規取引先"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "取引先情報を変更します。" : "新しい取引先を登録します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="grid gap-4">
          {/* 基本情報 */}
          <FormField
            name="accountName"
            label="取引先名"
            type="text"
            required
            defaultValue={account?.accountName}
            fieldErrors={fieldErrors.accountName}
            disabled={isPending}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="accountNameKana"
              label="取引先名（カナ）"
              type="text"
              defaultValue={account?.accountNameKana ?? ""}
              fieldErrors={fieldErrors.accountNameKana}
              disabled={isPending}
            />
            <FormField
              name="accountType"
              label="区分"
              type="select"
              required
              options={[
                { value: "CORPORATE", label: "法人" },
                { value: "INDIVIDUAL", label: "個人" },
              ]}
              defaultValue={account?.accountType ?? "CORPORATE"}
              fieldErrors={fieldErrors.accountType}
              disabled={isPending}
            />
          </div>

          {/* 支払条件 */}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              name="closingDay"
              label="締日"
              type="number"
              defaultValue={account?.closingDay ?? ""}
              fieldErrors={fieldErrors.closingDay}
              disabled={isPending}
            />
            <FormField
              name="paymentMonthOffset"
              label="支払月オフセット"
              type="number"
              defaultValue={account?.paymentMonthOffset ?? ""}
              fieldErrors={fieldErrors.paymentMonthOffset}
              disabled={isPending}
            />
            <FormField
              name="paymentDay"
              label="支払日"
              type="number"
              defaultValue={account?.paymentDay ?? ""}
              fieldErrors={fieldErrors.paymentDay}
              disabled={isPending}
            />
          </div>

          <FormField
            name="paymentTermsLabel"
            label="支払条件ラベル"
            type="text"
            defaultValue={account?.paymentTermsLabel ?? ""}
            fieldErrors={fieldErrors.paymentTermsLabel}
            disabled={isPending}
          />

          {/* 連絡先 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="phone"
              label="電話番号"
              type="text"
              defaultValue={account?.phone ?? ""}
              fieldErrors={fieldErrors.phone}
              disabled={isPending}
            />
            <FormField
              name="email"
              label="メールアドレス"
              type="text"
              defaultValue={account?.email ?? ""}
              fieldErrors={fieldErrors.email}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="zipCode"
              label="郵便番号"
              type="text"
              defaultValue={account?.zipCode ?? ""}
              fieldErrors={fieldErrors.zipCode}
              disabled={isPending}
            />
            <FormField
              name="address"
              label="住所"
              type="text"
              defaultValue={account?.address ?? ""}
              fieldErrors={fieldErrors.address}
              disabled={isPending}
            />
          </div>

          {/* 外部連携 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="mfPartnerId"
              label="MFクラウド取引先ID"
              type="text"
              defaultValue={account?.mfPartnerId ?? ""}
              fieldErrors={fieldErrors.mfPartnerId}
              disabled={isPending}
            />
            <FormField
              name="mfPartnerCode"
              label="MFクラウド取引先コード"
              type="text"
              defaultValue={account?.mfPartnerCode ?? ""}
              fieldErrors={fieldErrors.mfPartnerCode}
              disabled={isPending}
            />
          </div>

          <FormField
            name="legacyCompanyCode"
            label="旧法人コード"
            type="text"
            defaultValue={account?.legacyCompanyCode ?? ""}
            fieldErrors={fieldErrors.legacyCompanyCode}
            disabled={isPending}
          />

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
