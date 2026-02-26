"use client";

/**
 * 帰着処理ダイアログ
 *
 * DEPARTED ステータスの予約に対して帰着処理を実行する。
 * 実帰着日時・帰着時走行距離・燃料レベルを入力し、サービス層で
 * 予約を RETURNED に、車両を IN_STOCK に更新する。
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
import { returnReservation } from "@/app/actions/reservation";
import { toast } from "sonner";

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  reservationCode: string;
  departureOdometer: number;
}

/** 燃料レベルの選択肢 */
const fuelLevelOptions = [
  { value: "", label: "-- 未選択 --" },
  { value: "empty", label: "空" },
  { value: "1/4", label: "1/4" },
  { value: "1/2", label: "1/2" },
  { value: "3/4", label: "3/4" },
  { value: "full", label: "満タン" },
] as const;

/** datetime-local 用のフォーマット（YYYY-MM-DDTHH:mm） */
function toDatetimeLocalValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function ReturnDialog({
  open,
  onOpenChange,
  reservationId,
  reservationCode,
  departureOdometer,
}: ReturnDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [actualReturnDate, setActualReturnDate] = useState(
    toDatetimeLocalValue(new Date()),
  );
  const [returnOdometer, setReturnOdometer] = useState(
    String(departureOdometer),
  );
  const [fuelLevel, setFuelLevel] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!actualReturnDate) {
      setErrorMessage("実帰着日時を入力してください");
      return;
    }

    const odometer = Number(returnOdometer);
    if (isNaN(odometer) || odometer < 0) {
      setErrorMessage("走行距離は0以上の数値を入力してください");
      return;
    }

    if (odometer < departureOdometer) {
      setErrorMessage(
        `帰着時走行距離は出発時走行距離（${departureOdometer.toLocaleString()} km）以上を入力してください`,
      );
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const result = await returnReservation(
        reservationId,
        actualReturnDate,
        odometer,
        fuelLevel || undefined,
      );
      if (result.success) {
        toast.success("帰着処理が完了しました");
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
      setActualReturnDate(toDatetimeLocalValue(new Date()));
      setReturnOdometer(String(departureOdometer));
      setFuelLevel("");
      setErrorMessage(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>帰着処理</DialogTitle>
          <DialogDescription>
            予約「{reservationCode}」の帰着処理を行います。
            車両のステータスが「在庫」に変更されます。
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* 実帰着日時 */}
          <div className="grid gap-1.5">
            <Label htmlFor="actualReturnDate">
              実帰着日時
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="actualReturnDate"
              type="datetime-local"
              value={actualReturnDate}
              onChange={(e) => setActualReturnDate(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* 帰着時走行距離 */}
          <div className="grid gap-1.5">
            <Label htmlFor="returnOdometer">
              帰着時走行距離 (km)
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="returnOdometer"
              type="number"
              min={departureOdometer}
              value={returnOdometer}
              onChange={(e) => setReturnOdometer(e.target.value)}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">
              出発時: {departureOdometer.toLocaleString()} km
            </p>
          </div>

          {/* 燃料レベル */}
          <div className="grid gap-1.5">
            <Label htmlFor="fuelLevel">燃料レベル</Label>
            <Select
              value={fuelLevel}
              onValueChange={setFuelLevel}
            >
              <SelectTrigger id="fuelLevel" disabled={isPending}>
                <SelectValue placeholder="-- 未選択 --" />
              </SelectTrigger>
              <SelectContent>
                {fuelLevelOptions.map((opt) => (
                  <SelectItem key={opt.value || "__empty__"} value={opt.value || "__empty__"}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {isPending ? "処理中..." : "帰着する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
