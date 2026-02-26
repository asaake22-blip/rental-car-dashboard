"use client";

import { useCallback, useRef } from "react";
import type { GanttReservation, GanttViewMode, PendingChange } from "./gantt-types";
import { STATUS_COLORS, GANTT_CONST, getColWidth, getMsPerCol } from "./gantt-types";

interface GanttReservationBarProps {
  reservation: GanttReservation;
  viewMode: GanttViewMode;
  chartStartDate: Date;
  rowY: number;
  pendingChange?: PendingChange;
  onDragStart: (reservationId: string, edge: "left" | "right", startX: number) => void;
  onHover: (reservation: GanttReservation, x: number, y: number) => void;
  onHoverEnd: () => void;
  onClick: (reservationId: string) => void;
}

export function GanttReservationBar({
  reservation,
  viewMode,
  chartStartDate,
  rowY,
  pendingChange,
  onDragStart,
  onHover,
  onHoverEnd,
  onClick,
}: GanttReservationBarProps) {
  const barRef = useRef<SVGGElement>(null);

  const { BAR_HEIGHT, BAR_Y_OFFSET, HANDLE_WIDTH } = GANTT_CONST;
  const colWidth = getColWidth(viewMode);

  // 表示用の日時（pending があればそちらを使用）
  const pickupDate = new Date(pendingChange?.newPickupDate ?? reservation.pickupDate);
  const returnDate = new Date(pendingChange?.newReturnDate ?? reservation.returnDate);

  // チャート開始日からのオフセット計算
  const msPerCol = getMsPerCol(viewMode);
  const startOffset = (pickupDate.getTime() - chartStartDate.getTime()) / msPerCol;
  const endOffset = (returnDate.getTime() - chartStartDate.getTime()) / msPerCol;
  const barX = startOffset * colWidth;
  const barWidth = Math.max((endOffset - startOffset) * colWidth, 4);
  const barY = rowY + BAR_Y_OFFSET;

  const colors = STATUS_COLORS[reservation.status] ?? STATUS_COLORS.RESERVED;
  const isModified = !!pendingChange;
  const canDrag = ["RESERVED", "CONFIRMED"].includes(reservation.status);

  const handleMouseDown = useCallback(
    (edge: "left" | "right") => (e: React.MouseEvent) => {
      if (!canDrag) return;
      e.preventDefault();
      e.stopPropagation();
      onDragStart(reservation.id, edge, e.clientX);
    },
    [reservation.id, canDrag, onDragStart],
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      const svg = (e.target as SVGElement).closest("svg");
      if (svg) {
        const rect = svg.getBoundingClientRect();
        onHover(reservation, e.clientX - rect.left, e.clientY - rect.top);
      }
    },
    [reservation, onHover],
  );

  return (
    <g
      ref={barRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHoverEnd}
      onClick={() => onClick(reservation.id)}
      style={{ cursor: "pointer" }}
    >
      {/* バー本体 */}
      <rect
        x={barX}
        y={barY}
        width={barWidth}
        height={BAR_HEIGHT}
        rx={4}
        fill={isModified ? "#fff7ed" : colors.fill}
        stroke={isModified ? "#f97316" : colors.border}
        strokeWidth={isModified ? 2 : 1}
        strokeDasharray={isModified ? "4 2" : undefined}
      />

      {/* バー内テキスト（幅に余裕がある場合） */}
      {barWidth > 60 && (
        <text
          x={barX + 8}
          y={barY + BAR_HEIGHT / 2 + 4}
          fontSize={10}
          fill={isModified ? "#c2410c" : colors.text}
          fontWeight={500}
          style={{ pointerEvents: "none" }}
        >
          {barWidth > 120
            ? `${reservation.reservationCode} ${reservation.customerName}`
            : reservation.reservationCode}
        </text>
      )}

      {/* 左ドラッグハンドル */}
      {canDrag && (
        <rect
          x={barX}
          y={barY}
          width={HANDLE_WIDTH}
          height={BAR_HEIGHT}
          rx={4}
          fill="transparent"
          style={{ cursor: "ew-resize" }}
          onMouseDown={handleMouseDown("left")}
        />
      )}

      {/* 右ドラッグハンドル */}
      {canDrag && (
        <rect
          x={barX + barWidth - HANDLE_WIDTH}
          y={barY}
          width={HANDLE_WIDTH}
          height={BAR_HEIGHT}
          rx={4}
          fill="transparent"
          style={{ cursor: "ew-resize" }}
          onMouseDown={handleMouseDown("right")}
        />
      )}
    </g>
  );
}
