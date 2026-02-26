"use client";

import type { GanttVehicle, GanttViewMode, GanttReservation, PendingChange } from "./gantt-types";
import { GANTT_CONST, getColWidth } from "./gantt-types";
import { GanttReservationBar } from "./gantt-reservation-bar";

interface GanttVehicleRowProps {
  vehicle: GanttVehicle;
  rowIndex: number;
  viewMode: GanttViewMode;
  chartStartDate: Date;
  totalColumns: number;
  pendingChanges: Map<string, PendingChange>;
  onDragStart: (reservationId: string, edge: "left" | "right", startX: number) => void;
  onHover: (reservation: GanttReservation, x: number, y: number) => void;
  onHoverEnd: () => void;
  onBarClick: (reservationId: string) => void;
}

export function GanttVehicleRow({
  vehicle,
  rowIndex,
  viewMode,
  chartStartDate,
  totalColumns,
  pendingChanges,
  onDragStart,
  onHover,
  onHoverEnd,
  onBarClick,
}: GanttVehicleRowProps) {
  const { ROW_HEIGHT } = GANTT_CONST;
  const colWidth = getColWidth(viewMode);
  const rowY = rowIndex * ROW_HEIGHT;
  const isEven = rowIndex % 2 === 0;

  return (
    <g>
      {/* 行背景 */}
      <rect
        x={0}
        y={rowY}
        width={totalColumns * colWidth}
        height={ROW_HEIGHT}
        fill={isEven ? "#ffffff" : "#f8fafc"}
        stroke="#e2e8f0"
        strokeWidth={0.5}
      />

      {/* 予約バー */}
      {vehicle.reservations.map((r) => (
        <GanttReservationBar
          key={r.id}
          reservation={r}
          viewMode={viewMode}
          chartStartDate={chartStartDate}
          rowY={rowY}
          pendingChange={pendingChanges.get(r.id)}
          onDragStart={onDragStart}
          onHover={onHover}
          onHoverEnd={onHoverEnd}
          onClick={onBarClick}
        />
      ))}
    </g>
  );
}
