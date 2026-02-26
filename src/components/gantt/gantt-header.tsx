"use client";

import type { GanttViewMode } from "./gantt-types";
import { getColWidth } from "./gantt-types";

interface GanttHeaderProps {
  viewMode: GanttViewMode;
  startDate: Date;
  totalColumns: number;
  headerHeight: number;
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

export function GanttHeader({ viewMode, startDate, totalColumns, headerHeight }: GanttHeaderProps) {
  const colWidth = getColWidth(viewMode);

  if (viewMode === "3month" || viewMode === "6month") {
    return (
      <MultiMonthHeader
        viewMode={viewMode}
        startDate={startDate}
        totalColumns={totalColumns}
        headerHeight={headerHeight}
        colWidth={colWidth}
      />
    );
  }

  // month / 3day: 既存ロジック
  const columns: { label: string; subLabel: string; isWeekend: boolean; isToday: boolean }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (viewMode === "month") {
    for (let i = 0; i < totalColumns; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      const todayMatch = d.getTime() === today.getTime();
      columns.push({
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        subLabel: DAY_NAMES[dow],
        isWeekend: dow === 0 || dow === 6,
        isToday: todayMatch,
      });
    }
  } else {
    for (let i = 0; i < totalColumns; i++) {
      const d = new Date(startDate);
      d.setHours(d.getHours() + i);
      const hour = d.getHours();
      const todayMatch = d.toDateString() === today.toDateString();
      columns.push({
        label: hour === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : `${hour}時`,
        subLabel: hour === 0 ? DAY_NAMES[d.getDay()] : "",
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: todayMatch,
      });
    }
  }

  return (
    <g>
      {columns.map((col, i) => {
        const x = i * colWidth;
        let fill = "#ffffff";
        if (col.isToday) fill = "#eff6ff";
        else if (col.isWeekend) fill = "#fafafa";

        return (
          <g key={i}>
            <rect x={x} y={0} width={colWidth} height={headerHeight} fill={fill} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={x + colWidth / 2} y={20} textAnchor="middle" fontSize={10} fill={col.isToday ? "#2563eb" : col.isWeekend ? "#9ca3af" : "#64748b"} fontWeight={col.isToday ? 700 : 400}>
              {col.label}
            </text>
            {col.subLabel && (
              <text x={x + colWidth / 2} y={36} textAnchor="middle" fontSize={9} fill={col.isToday ? "#3b82f6" : "#9ca3af"}>
                {col.subLabel}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** 3か月/6か月用ヘッダー: 上段=月名、下段=日付（間引き表示） */
function MultiMonthHeader({
  viewMode,
  startDate,
  totalColumns,
  headerHeight,
  colWidth,
}: {
  viewMode: GanttViewMode;
  startDate: Date;
  totalColumns: number;
  headerHeight: number;
  colWidth: number;
}) {
  const monthRowHeight = 24;
  const dayRowHeight = headerHeight - monthRowHeight;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 日付間引き間隔
  const labelInterval = viewMode === "3month" ? 5 : 10;

  // 全日付のデータを構築
  const days: { date: Date; colIndex: number; isWeekend: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < totalColumns; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push({
      date: d,
      colIndex: i,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isToday: d.getTime() === today.getTime(),
    });
  }

  // 月ごとのグループ
  const months: { year: number; month: number; startCol: number; colCount: number }[] = [];
  let currentMonth = -1;
  let currentYear = -1;
  for (let i = 0; i < days.length; i++) {
    const m = days[i].date.getMonth();
    const y = days[i].date.getFullYear();
    if (m !== currentMonth || y !== currentYear) {
      months.push({ year: y, month: m, startCol: i, colCount: 1 });
      currentMonth = m;
      currentYear = y;
    } else {
      months[months.length - 1].colCount++;
    }
  }

  return (
    <g>
      {/* 上段: 月名バー */}
      {months.map((m, i) => {
        const x = m.startCol * colWidth;
        const width = m.colCount * colWidth;
        return (
          <g key={`month-${i}`}>
            <rect x={x} y={0} width={width} height={monthRowHeight} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={0.5} />
            <text
              x={x + width / 2}
              y={monthRowHeight / 2 + 5}
              textAnchor="middle"
              fontSize={11}
              fill="#334155"
              fontWeight={600}
            >
              {m.year !== startDate.getFullYear() || m.month === 0
                ? `${m.year}年${m.month + 1}月`
                : `${m.month + 1}月`}
            </text>
          </g>
        );
      })}

      {/* 下段: 日付（間引き表示） */}
      {days.map((day) => {
        const x = day.colIndex * colWidth;
        let fill = "#ffffff";
        if (day.isToday) fill = "#eff6ff";
        else if (day.isWeekend) fill = "#fafafa";

        const dayOfMonth = day.date.getDate();
        const showLabel = dayOfMonth === 1 || dayOfMonth % labelInterval === 0;

        return (
          <g key={day.colIndex}>
            <rect x={x} y={monthRowHeight} width={colWidth} height={dayRowHeight} fill={fill} stroke="#e2e8f0" strokeWidth={0.5} />
            {showLabel && (
              <text
                x={x + colWidth / 2}
                y={monthRowHeight + dayRowHeight / 2 + 4}
                textAnchor="middle"
                fontSize={8}
                fill={day.isToday ? "#2563eb" : "#94a3b8"}
                fontWeight={day.isToday ? 700 : 400}
              >
                {dayOfMonth}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
