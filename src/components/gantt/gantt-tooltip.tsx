"use client";

import type { GanttReservation, PendingChange } from "./gantt-types";
import { STATUS_COLORS } from "./gantt-types";

interface GanttTooltipProps {
  reservation: GanttReservation;
  x: number;
  y: number;
  pendingChange?: PendingChange;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function GanttTooltip({ reservation, x, y, pendingChange }: GanttTooltipProps) {
  const colors = STATUS_COLORS[reservation.status] ?? STATUS_COLORS.RESERVED;
  const pickup = pendingChange?.newPickupDate ?? reservation.pickupDate;
  const returnD = pendingChange?.newReturnDate ?? reservation.returnDate;

  return (
    <div
      className="absolute z-50 pointer-events-none rounded-lg border bg-white shadow-lg p-3 text-xs min-w-48"
      style={{ left: x + 12, top: y - 8 }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: colors.fill, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {reservation.status}
        </span>
        <span className="font-semibold">{reservation.reservationCode}</span>
      </div>
      <div className="space-y-0.5 text-muted-foreground">
        <div>{reservation.customerName}</div>
        <div>{reservation.customerPhone}</div>
        <div>出発: {formatDate(pickup)} ({reservation.pickupOfficeName})</div>
        <div>帰着: {formatDate(returnD)} ({reservation.returnOfficeName})</div>
        {reservation.estimatedAmount != null && (
          <div>見積: ¥{reservation.estimatedAmount.toLocaleString()}</div>
        )}
        {pendingChange && (
          <div className="mt-1 pt-1 border-t text-orange-600 font-medium">
            変更あり（未保存）
          </div>
        )}
      </div>
    </div>
  );
}
