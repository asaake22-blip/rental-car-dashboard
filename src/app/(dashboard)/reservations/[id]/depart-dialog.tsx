"use client";

/**
 * 出発処理ダイアログ
 *
 * CONFIRMED ステータスの予約に対して出発処理を実行する。
 * 実出発日時と出発時走行距離を入力し、サービス層で
 * 予約を DEPARTED に、車両を RENTED に更新する。
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
import { departReservation } from "@/app/actions/reservation";
import { toast } from "sonner";

interface DepartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  reservationCode: string;
  vehicleMileage: number;
}

/** datetime-local 用のフォーマット（YYYY-MM-DDTHH:mm） */
function toDatetimeLocalValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function DepartDialog({
  open,
  onOpenChange,
  reservationId,
  reservationCode,
  vehicleMileage,
}: DepartDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [actualPickupDate, setActualPickupDate] = useState(
    toDatetimeLocalValue(new Date()),
  );
  const [departureOdometer, setDepartureOdometer] = useState(
    String(vehicleMileage),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!actualPickupDate) {
      setErrorMessage("実出発日時を入力してください");
      return;
    }

    const odometer = Number(departureOdometer);
    if (isNaN(odometer) || odometer < 0) {
      setErrorMessage("走行距離は0以上の数値を入力してください");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const result = await departReservation(
        reservationId,
        actualPickupDate,
        odometer,
      );
      if (result.success) {
        toast.success("出発処理が完了しました");
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
      setActualPickupDate(toDatetimeLocalValue(new Date()));
      setDepartureOdometer(String(vehicleMileage));
      setErrorMessage(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>出発処理</DialogTitle>
          <DialogDescription>
            予約「{reservationCode}」の出発処理を行います。
            車両のステータスが「貸出中」に変更されます。
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* 実出発日時 */}
          <div className="grid gap-1.5">
            <Label htmlFor="actualPickupDate">
              実出発日時
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="actualPickupDate"
              type="datetime-local"
              value={actualPickupDate}
              onChange={(e) => setActualPickupDate(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* 出発時走行距離 */}
          <div className="grid gap-1.5">
            <Label htmlFor="departureOdometer">
              出発時走行距離 (km)
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="departureOdometer"
              type="number"
              min={0}
              value={departureOdometer}
              onChange={(e) => setDepartureOdometer(e.target.value)}
              disabled={isPending}
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
            {isPending ? "処理中..." : "出発する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
