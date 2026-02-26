"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { bulkAllocatePayment } from "@/app/actions/payment";
import { getUnallocatedReservations } from "@/app/actions/payment";
import { toast } from "sonner";

interface AllocationFormProps {
  paymentId: string;
  paymentRemaining: number;
}

type ReservationCandidate = {
  id: string;
  reservationCode: string;
  customerName: string;
  actualAmount: number;
  taxAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  invoices: { id: string; invoiceNumber: string }[];
};

type SelectedReservation = {
  reservationId: string;
  allocatedAmount: number;
  note: string;
  invoiceId?: string;
};

export function AllocationForm({
  paymentId,
  paymentRemaining,
}: AllocationFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reservations, setReservations] = useState<ReservationCandidate[]>([]);
  const [selected, setSelected] = useState<Map<string, SelectedReservation>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUnallocatedReservations();
      setReservations(result as ReservationCandidate[]);
    } catch {
      toast.error("予約データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadReservations();
      setSelected(new Map());
    }
  }, [open, loadReservations]);

  const toggleReservation = (reservation: ReservationCandidate, checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) {
        // デフォルトの消込金額: 残額 or 入金残額の小さい方
        const totalSelected = Array.from(next.values()).reduce(
          (sum, s) => sum + s.allocatedAmount,
          0
        );
        const availablePayment = paymentRemaining - totalSelected;
        const amount = Math.min(reservation.remainingAmount, Math.max(0, availablePayment));
        next.set(reservation.id, {
          reservationId: reservation.id,
          allocatedAmount: amount,
          note: "",
          invoiceId: reservation.invoices.length === 1 ? reservation.invoices[0].id : undefined,
        });
      } else {
        next.delete(reservation.id);
      }
      return next;
    });
  };

  const updateAmount = (reservationId: string, amount: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const existing = next.get(reservationId);
      if (existing) {
        next.set(reservationId, { ...existing, allocatedAmount: amount });
      }
      return next;
    });
  };

  const updateInvoiceId = (reservationId: string, invoiceId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const existing = next.get(reservationId);
      if (existing) {
        next.set(reservationId, { ...existing, invoiceId: invoiceId || undefined });
      }
      return next;
    });
  };

  const totalAllocating = Array.from(selected.values()).reduce(
    (sum, s) => sum + s.allocatedAmount,
    0
  );

  const handleConfirm = () => {
    if (selected.size === 0) {
      toast.error("消込対象の予約を選択してください");
      return;
    }
    if (totalAllocating > paymentRemaining) {
      toast.error("消込合計が入金残額を超えています");
      return;
    }

    const allocations = Array.from(selected.values())
      .filter((s) => s.allocatedAmount > 0)
      .map((s) => ({
        reservationId: s.reservationId,
        allocatedAmount: s.allocatedAmount,
        invoiceId: s.invoiceId,
      }));
    if (allocations.length === 0) {
      toast.error("消込金額が0のものは消込できません");
      return;
    }

    startTransition(async () => {
      const result = await bulkAllocatePayment(paymentId, allocations);
      if (result.success) {
        toast.success(`${allocations.length}件の消込を追加しました`);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  // 入金残額が0以下の場合は消込追加ボタンを無効化
  if (paymentRemaining <= 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          消込追加
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>消込追加</DialogTitle>
          <DialogDescription>
            精算済みの予約から消込対象を選択し、金額を入力してください。
            入金残額:{" "}
            {`\u00a5${paymentRemaining.toLocaleString("ja-JP")}`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">
            予約データを読み込み中...
          </p>
        ) : reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            消込可能な予約がありません
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead className="whitespace-nowrap">予約番号</TableHead>
                  <TableHead className="whitespace-nowrap">顧客名</TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    精算金額
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    消込済
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    残額
                  </TableHead>
                  <TableHead className="whitespace-nowrap">請求書</TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    消込金額
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => {
                  const isSelected = selected.has(reservation.id);
                  const selectedData = selected.get(reservation.id);
                  return (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            toggleReservation(reservation, !!checked)
                          }
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">
                        {reservation.reservationCode}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {reservation.customerName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {`\u00a5${(reservation.actualAmount + reservation.taxAmount).toLocaleString("ja-JP")}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {`\u00a5${reservation.allocatedAmount.toLocaleString("ja-JP")}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {`\u00a5${reservation.remainingAmount.toLocaleString("ja-JP")}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {reservation.invoices.length > 0 ? (
                          isSelected ? (
                            <select
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              value={selectedData?.invoiceId ?? ""}
                              onChange={(e) => updateInvoiceId(reservation.id, e.target.value)}
                              disabled={isPending}
                            >
                              <option value="">なし</option>
                              {reservation.invoices.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.invoiceNumber}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {reservation.invoices.map((inv) => inv.invoiceNumber).join(", ")}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {isSelected ? (
                          <Input
                            type="number"
                            className="w-[120px] text-right ml-auto"
                            value={selectedData?.allocatedAmount ?? 0}
                            onChange={(e) =>
                              updateAmount(
                                reservation.id,
                                Number(e.target.value) || 0
                              )
                            }
                            min={0}
                            max={reservation.remainingAmount}
                            disabled={isPending}
                          />
                        ) : (
                          <span className="text-muted-foreground text-right block">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {selected.size > 0 && (
          <div className="flex items-center gap-6 text-sm rounded-md bg-muted/50 px-4 py-3">
            <div>
              <span className="text-muted-foreground">選択: </span>
              <span className="font-medium">{selected.size}件</span>
            </div>
            <div>
              <span className="text-muted-foreground">消込合計: </span>
              <span
                className={`font-medium ${totalAllocating > paymentRemaining ? "text-red-600" : ""}`}
              >
                {`\u00a5${totalAllocating.toLocaleString("ja-JP")}`}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">残額: </span>
              <span className="font-medium">
                {`\u00a5${(paymentRemaining - totalAllocating).toLocaleString("ja-JP")}`}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || selected.size === 0}
          >
            {isPending ? "処理中..." : "消込を確定"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
