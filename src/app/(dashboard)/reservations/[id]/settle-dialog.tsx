"use client";

/**
 * 精算処理ダイアログ
 *
 * RETURNED ステータスの予約に対して精算処理を実行する。
 * 精算金額・決済手段・備考を入力し、サービス層で
 * 予約を SETTLED に更新し、Payment を自動作成する。
 */

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { settleReservation } from "@/app/actions/reservation";
import { toast } from "sonner";

interface SettleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  reservationCode: string;
  estimatedAmount: number | null;
}

/** 決済手段の選択肢（PaymentCategory enum に対応） */
const paymentCategoryOptions = [
  { value: "CASH", label: "現金" },
  { value: "CREDIT_CARD", label: "クレジットカード" },
  { value: "ELECTRONIC_MONEY", label: "電子マネー" },
  { value: "QR_PAYMENT", label: "QRコード決済" },
  { value: "BANK_TRANSFER", label: "銀行振込" },
  { value: "CHECK", label: "小切手" },
  { value: "OTHER", label: "その他" },
] as const;

export function SettleDialog({
  open,
  onOpenChange,
  reservationId,
  reservationCode,
  estimatedAmount,
}: SettleDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [actualAmount, setActualAmount] = useState(
    String(estimatedAmount ?? 0),
  );
  const [paymentCategory, setPaymentCategory] = useState("CASH");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    const amount = Number(actualAmount);
    if (isNaN(amount) || amount < 0) {
      setErrorMessage("精算金額は0以上の数値を入力してください");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const result = await settleReservation(
        reservationId,
        amount,
        paymentCategory,
        note || undefined,
      );
      if (result.success) {
        toast.success("精算処理が完了しました");
        onOpenChange(false);
      } else {
        setErrorMessage(result.error);
        toast.error(result.error);
      }
    });
  };

  // ダイアログが開くたびにデフォルト値をリセット
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setActualAmount(String(estimatedAmount ?? 0));
      setPaymentCategory("CASH");
      setNote("");
      setErrorMessage(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>精算処理</DialogTitle>
          <DialogDescription>
            予約「{reservationCode}」の精算処理を行います。
            入金レコードが自動作成されます。
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* 精算金額 */}
          <div className="grid gap-1.5">
            <Label htmlFor="actualAmount">
              精算金額 (円)
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="actualAmount"
              type="number"
              min={0}
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              disabled={isPending}
            />
            {estimatedAmount != null && (
              <p className="text-muted-foreground text-xs">
                見積金額: {estimatedAmount.toLocaleString()} 円
              </p>
            )}
          </div>

          {/* 決済手段 */}
          <div className="grid gap-1.5">
            <Label htmlFor="paymentCategory">
              決済手段
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select
              value={paymentCategory}
              onValueChange={setPaymentCategory}
            >
              <SelectTrigger id="paymentCategory" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentCategoryOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 備考 */}
          <div className="grid gap-1.5">
            <Label htmlFor="settleNote">備考</Label>
            <Textarea
              id="settleNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
              placeholder="精算に関するメモがあれば入力してください"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "処理中..." : "精算する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
