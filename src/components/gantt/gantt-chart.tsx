"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { GanttViewMode, GanttReservation, PendingChange, GanttVehicle } from "./gantt-types";
import { GANTT_CONST, getColWidth, getMsPerCol } from "./gantt-types";
import { useGanttData } from "./use-gantt-data";
import { GanttControls } from "./gantt-controls";
import { GanttHeader } from "./gantt-header";
import { GanttVehicleRow } from "./gantt-vehicle-row";
import { GanttTooltip } from "./gantt-tooltip";

interface GanttChartProps {
  offices: { id: string; officeName: string }[];
  vehicleClasses: { id: string; className: string }[];
}

/** 月の日数 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function GanttChart({ offices, vehicleClasses }: GanttChartProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const vehicleRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);

  // --- 表示状態 ---
  const [viewMode, setViewMode] = useState<GanttViewMode>("month");
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [officeId, setOfficeId] = useState("all");
  const [vehicleClassId, setVehicleClassId] = useState("all");

  // --- 編集状態 ---
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [saving, setSaving] = useState(false);
  const editMode = pendingChanges.size > 0;

  // --- ドラッグ状態 ---
  const [dragging, setDragging] = useState<{
    reservationId: string;
    edge: "left" | "right";
    startX: number;
    originalReservation: GanttReservation;
  } | null>(null);

  // --- ツールチップ ---
  const [tooltip, setTooltip] = useState<{
    reservation: GanttReservation;
    x: number;
    y: number;
  } | null>(null);

  // --- ドラッグ中の日付インジケーター ---
  const [dragIndicator, setDragIndicator] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // --- 日付範囲 ---
  const endDate = useMemo(() => {
    const d = new Date(startDate);
    switch (viewMode) {
      case "month":
        return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      case "3month":
        return new Date(d.getFullYear(), d.getMonth() + 3, 0, 23, 59, 59);
      case "6month":
        return new Date(d.getFullYear(), d.getMonth() + 6, 0, 23, 59, 59);
      case "3day":
        d.setDate(d.getDate() + 3);
        return d;
    }
  }, [viewMode, startDate]);

  const totalColumns = useMemo(() => {
    if (viewMode === "3day") return 72; // 3日間 x 24時間
    const monthCount = viewMode === "month" ? 1 : viewMode === "3month" ? 3 : 6;
    let days = 0;
    for (let i = 0; i < monthCount; i++) {
      days += daysInMonth(startDate.getFullYear(), startDate.getMonth() + i);
    }
    return days;
  }, [viewMode, startDate]);

  // --- データフェッチ ---
  const { data, loading, error: fetchError, refetch } = useGanttData({
    startDate,
    endDate,
    officeId: officeId === "all" ? undefined : officeId,
    vehicleClassId: vehicleClassId === "all" ? undefined : vehicleClassId,
  });

  const vehicles: GanttVehicle[] = data?.vehicles ?? [];

  // --- ナビゲーション ---
  const handleNavigate = useCallback((direction: "prev" | "next" | "today") => {
    setStartDate((prev) => {
      if (direction === "today") {
        const now = new Date();
        return viewMode === "3day"
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
          : new Date(now.getFullYear(), now.getMonth(), 1);
      }
      const d = new Date(prev);
      if (viewMode === "3day") {
        d.setDate(d.getDate() + (direction === "next" ? 3 : -3));
      } else {
        d.setMonth(d.getMonth() + (direction === "next" ? 1 : -1));
      }
      return d;
    });
  }, [viewMode]);

  // --- ドラッグ処理 ---
  const findReservation = useCallback(
    (id: string): GanttReservation | undefined => {
      for (const v of vehicles) {
        const r = v.reservations.find((r) => r.id === id);
        if (r) return r;
      }
      return undefined;
    },
    [vehicles],
  );

  const handleDragStart = useCallback(
    (reservationId: string, edge: "left" | "right", startX: number) => {
      const reservation = findReservation(reservationId);
      if (!reservation) return;
      didDragRef.current = true;
      setDragging({ reservationId, edge, startX, originalReservation: reservation });
      setTooltip(null);
    },
    [findReservation],
  );

  // ドラッグ中のマウス移動とマウスアップ
  useEffect(() => {
    if (!dragging) return;

    const colWidth = getColWidth(viewMode);
    const msPerCol = getMsPerCol(viewMode);

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragging.startX;
      const deltaCols = Math.round(deltaX / colWidth);
      const deltaMs = deltaCols * msPerCol;

      const orig = dragging.originalReservation;
      const existing = pendingChanges.get(dragging.reservationId);

      let newPickup = new Date(existing?.newPickupDate ?? orig.pickupDate);
      let newReturn = new Date(existing?.newReturnDate ?? orig.returnDate);

      if (dragging.edge === "left") {
        newPickup = new Date(new Date(orig.pickupDate).getTime() + deltaMs);
        if (newPickup >= newReturn) {
          newPickup = new Date(newReturn.getTime() - msPerCol);
        }
      } else {
        newReturn = new Date(new Date(orig.returnDate).getTime() + deltaMs);
        if (newReturn <= newPickup) {
          newReturn = new Date(newPickup.getTime() + msPerCol);
        }
      }

      setPendingChanges((prev) => {
        const next = new Map(prev);
        next.set(dragging.reservationId, {
          reservationId: dragging.reservationId,
          reservationCode: orig.reservationCode,
          originalPickupDate: orig.pickupDate,
          originalReturnDate: orig.returnDate,
          newPickupDate: newPickup.toISOString(),
          newReturnDate: newReturn.toISOString(),
        });
        return next;
      });

      // ドラッグ中のエッジに対応する日付をインジケーターに表示
      const edgeDate = dragging.edge === "left" ? newPickup : newReturn;
      const edgeOffset = (edgeDate.getTime() - startDate.getTime()) / msPerCol;
      const edgeX = edgeOffset * colWidth;
      // 車両のrowIndexを探す
      let rowY = 0;
      for (let vi = 0; vi < vehicles.length; vi++) {
        if (vehicles[vi].reservations.some((r) => r.id === dragging.reservationId)) {
          rowY = vi * GANTT_CONST.ROW_HEIGHT;
          break;
        }
      }
      const label = viewMode === "3day"
        ? `${edgeDate.getMonth() + 1}/${edgeDate.getDate()} ${edgeDate.getHours()}:00`
        : `${edgeDate.getMonth() + 1}/${edgeDate.getDate()}`;
      setDragIndicator({ x: edgeX, y: rowY, label });
    };

    const handleMouseUp = () => {
      setDragging(null);
      setDragIndicator(null);
      // click イベントの後にフラグをリセット
      setTimeout(() => { didDragRef.current = false; }, 0);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, viewMode, pendingChanges]);

  // --- 保存・キャンセル ---
  const handleSave = useCallback(async () => {
    if (pendingChanges.size === 0) return;
    setSaving(true);

    const changes = Array.from(pendingChanges.values()).map((c) => ({
      reservationId: c.reservationId,
      pickupDate: c.newPickupDate,
      returnDate: c.newReturnDate,
    }));

    try {
      const res = await fetch("/api/dispatch/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${changes.length}件の予約を更新しました`);
        setPendingChanges(new Map());
        refetch();
      } else {
        toast.error(json.error || "更新に失敗しました");
      }
    } catch {
      toast.error("ネットワークエラーが発生しました");
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, refetch]);

  const handleCancel = useCallback(() => {
    setPendingChanges(new Map());
  }, []);

  // --- サイズ計算 ---
  const colWidth = getColWidth(viewMode);
  const headerHeight = viewMode === "3month" || viewMode === "6month" ? 72 : GANTT_CONST.HEADER_HEIGHT;
  const contentWidth = totalColumns * colWidth;
  const contentHeight = vehicles.length * GANTT_CONST.ROW_HEIGHT;
  const { VEHICLE_COL_WIDTH, ROW_HEIGHT } = GANTT_CONST;

  // --- ツールチップ（座標をコンテンツ領域基準→外側コンテナ基準に変換） ---
  const handleHover = useCallback((reservation: GanttReservation, x: number, y: number) => {
    if (dragging) return;
    const content = contentRef.current;
    if (!content) return;
    const adjustedX = x - content.scrollLeft + VEHICLE_COL_WIDTH;
    const adjustedY = y - content.scrollTop + headerHeight;
    setTooltip({ reservation, x: adjustedX, y: adjustedY });
  }, [dragging, headerHeight, VEHICLE_COL_WIDTH]);

  const handleHoverEnd = useCallback(() => {
    setTooltip(null);
  }, []);

  // --- バークリック ---
  const handleBarClick = useCallback(
    (reservationId: string) => {
      if (dragging || didDragRef.current) return;
      router.push(`/reservations/${reservationId}`);
    },
    [dragging, router],
  );

  // --- 今日のライン（コンテンツ領域基準、x=0起点） ---
  const todayLineX = useMemo(() => {
    const now = new Date();
    const msPerCol = getMsPerCol(viewMode);
    const offset = (now.getTime() - startDate.getTime()) / msPerCol;
    return offset * colWidth;
  }, [viewMode, startDate, colWidth]);

  // --- スクロール同期 ---
  const handleScroll = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    if (headerRef.current) headerRef.current.scrollLeft = content.scrollLeft;
    if (vehicleRef.current) vehicleRef.current.scrollTop = content.scrollTop;
  }, []);

  return (
    <div className="space-y-3">
      {/* コントロールバー */}
      <GanttControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        startDate={startDate}
        onNavigate={handleNavigate}
        officeId={officeId}
        onOfficeChange={setOfficeId}
        vehicleClassId={vehicleClassId}
        onVehicleClassChange={setVehicleClassId}
        offices={offices}
        vehicleClasses={vehicleClasses}
        editMode={editMode}
        pendingCount={pendingChanges.size}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />

      {/* チャート本体（4クワドラント: コーナー / ヘッダー / 車両カラム / コンテンツ） */}
      <div className="relative border rounded-lg bg-white overflow-hidden" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-40">
            <span className="text-sm text-muted-foreground">読み込み中...</span>
          </div>
        )}

        {vehicles.length === 0 && !loading && (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            {fetchError ? `エラー: ${fetchError}` : "表示する車両がありません"}
          </div>
        )}

        {vehicles.length > 0 && (
          <>
            {/* 左上コーナー: 固定 */}
            <div
              className="absolute top-0 left-0 z-30 bg-white"
              style={{ width: VEHICLE_COL_WIDTH, height: headerHeight }}
            >
              <svg
                width={VEHICLE_COL_WIDTH}
                height={headerHeight}
                viewBox={`0 0 ${VEHICLE_COL_WIDTH} ${headerHeight}`}
                className="block"
              >
                <rect x={0} y={0} width={VEHICLE_COL_WIDTH} height={headerHeight} fill="#f8fafc" stroke="#e2e8f0" />
                <text x={VEHICLE_COL_WIDTH / 2} y={headerHeight / 2 + 4} textAnchor="middle" fontSize={12} fill="#64748b" fontWeight={600}>
                  車両
                </text>
              </svg>
            </div>

            {/* 上部ヘッダー: 固定上端、横スクロールはコンテンツと同期 */}
            <div
              ref={headerRef}
              className="absolute top-0 z-20 overflow-hidden"
              style={{ left: VEHICLE_COL_WIDTH, right: 0, height: headerHeight }}
            >
              <svg
                width={contentWidth}
                height={headerHeight}
                viewBox={`0 0 ${contentWidth} ${headerHeight}`}
                className="block"
              >
                <GanttHeader viewMode={viewMode} startDate={startDate} totalColumns={totalColumns} headerHeight={headerHeight} />
              </svg>
            </div>

            {/* 車両カラム: 固定左端、縦スクロールはコンテンツと同期 */}
            <div
              ref={vehicleRef}
              className="absolute left-0 z-20 overflow-hidden bg-white"
              style={{ top: headerHeight, width: VEHICLE_COL_WIDTH, bottom: 0 }}
            >
              <svg
                width={VEHICLE_COL_WIDTH}
                height={contentHeight}
                viewBox={`0 0 ${VEHICLE_COL_WIDTH} ${contentHeight}`}
                className="block"
              >
                {vehicles.map((v, i) => {
                  const rowY = i * ROW_HEIGHT;
                  const isEven = i % 2 === 0;
                  return (
                    <g key={v.id}>
                      <rect x={0} y={rowY} width={VEHICLE_COL_WIDTH} height={ROW_HEIGHT} fill={isEven ? "#f8fafc" : "#f1f5f9"} stroke="#e2e8f0" strokeWidth={0.5} />
                      <text x={8} y={rowY + 18} fontSize={11} fill="#1e293b" fontWeight={600}>
                        {v.vehicleCode}
                      </text>
                      <text x={8} y={rowY + 34} fontSize={9} fill="#94a3b8">
                        {v.maker} {v.modelName} [{v.vehicleClassName}]
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* メインコンテンツ: 縦横スクロール可能 */}
            <div
              ref={contentRef}
              className="overflow-auto"
              style={{
                marginLeft: VEHICLE_COL_WIDTH,
                marginTop: headerHeight,
                maxHeight: `calc(100vh - 200px - ${headerHeight}px)`,
              }}
              onScroll={handleScroll}
            >
              <svg
                width={contentWidth}
                height={contentHeight}
                viewBox={`0 0 ${contentWidth} ${contentHeight}`}
                className="block select-none"
                style={{ cursor: dragging ? "ew-resize" : "default" }}
              >
                {/* 車両行（背景 + 予約バー） */}
                {vehicles.map((vehicle, i) => (
                  <GanttVehicleRow
                    key={vehicle.id}
                    vehicle={vehicle}
                    rowIndex={i}
                    viewMode={viewMode}
                    chartStartDate={startDate}
                    totalColumns={totalColumns}
                    pendingChanges={pendingChanges}
                    onDragStart={handleDragStart}
                    onHover={handleHover}
                    onHoverEnd={handleHoverEnd}
                    onBarClick={handleBarClick}
                  />
                ))}

                {/* 今日のライン */}
                {todayLineX > 0 && todayLineX < contentWidth && (
                  <line
                    x1={todayLineX}
                    y1={0}
                    x2={todayLineX}
                    y2={contentHeight}
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    style={{ pointerEvents: "none" }}
                  />
                )}

                {/* ドラッグ中の日付インジケーター */}
                {dragIndicator && (
                  <g style={{ pointerEvents: "none" }}>
                    <line
                      x1={dragIndicator.x}
                      y1={dragIndicator.y}
                      x2={dragIndicator.x}
                      y2={dragIndicator.y + ROW_HEIGHT}
                      stroke="#7c3aed"
                      strokeWidth={2}
                    />
                    <rect
                      x={dragIndicator.x - 30}
                      y={dragIndicator.y - 20}
                      width={60}
                      height={18}
                      rx={4}
                      fill="#7c3aed"
                    />
                    <text
                      x={dragIndicator.x}
                      y={dragIndicator.y - 8}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#ffffff"
                      fontWeight={600}
                    >
                      {dragIndicator.label}
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </>
        )}

        {/* ツールチップ */}
        {tooltip && (
          <GanttTooltip
            reservation={tooltip.reservation}
            x={tooltip.x}
            y={tooltip.y}
            pendingChange={pendingChanges.get(tooltip.reservation.id)}
          />
        )}
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {[
          { status: "RESERVED", label: "予約" },
          { status: "CONFIRMED", label: "配車済" },
          { status: "DEPARTED", label: "出発中" },
          { status: "RETURNED", label: "帰着" },
          { status: "SETTLED", label: "精算済" },
        ].map(({ status, label }) => {
          const c = (
            { RESERVED: "#3b82f6", CONFIRMED: "#22c55e", DEPARTED: "#eab308", RETURNED: "#6366f1", SETTLED: "#9ca3af" } as Record<string, string>
          )[status];
          return (
            <div key={status} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
              <span>{label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border-2 border-dashed border-orange-400 bg-orange-50" />
          <span>変更あり</span>
        </div>
      </div>
    </div>
  );
}
