"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Save, X } from "lucide-react";
import type { GanttViewMode } from "./gantt-types";

interface GanttControlsProps {
  viewMode: GanttViewMode;
  onViewModeChange: (mode: GanttViewMode) => void;
  startDate: Date;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  officeId: string;
  onOfficeChange: (id: string) => void;
  vehicleClassId: string;
  onVehicleClassChange: (id: string) => void;
  offices: { id: string; officeName: string }[];
  vehicleClasses: { id: string; className: string }[];
  editMode: boolean;
  pendingCount: number;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function formatPeriodLabel(startDate: Date, viewMode: GanttViewMode): string {
  if (viewMode === "month") {
    return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月`;
  }
  if (viewMode === "3month") {
    const endMonth = ((startDate.getMonth() + 2) % 12) + 1;
    const endYear = startDate.getFullYear() + Math.floor((startDate.getMonth() + 2) / 12);
    return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月〜${endYear !== startDate.getFullYear() ? `${endYear}年` : ""}${endMonth}月`;
  }
  if (viewMode === "6month") {
    const endMonth = ((startDate.getMonth() + 5) % 12) + 1;
    const endYear = startDate.getFullYear() + Math.floor((startDate.getMonth() + 5) / 12);
    return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月〜${endYear !== startDate.getFullYear() ? `${endYear}年` : ""}${endMonth}月`;
  }
  const end = new Date(startDate);
  end.setDate(end.getDate() + 2);
  return `${startDate.getMonth() + 1}/${startDate.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
}

export function GanttControls({
  viewMode,
  onViewModeChange,
  startDate,
  onNavigate,
  officeId,
  onOfficeChange,
  vehicleClassId,
  onVehicleClassChange,
  offices,
  vehicleClasses,
  editMode,
  pendingCount,
  onSave,
  onCancel,
  saving,
}: GanttControlsProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 編集モード表示 */}
      {editMode && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
          <span className="text-sm font-medium text-orange-700">
            編集モード（{pendingCount}件の変更）
          </span>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={saving} className="h-7 gap-1">
            <X className="size-3.5" />
            キャンセル
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving || pendingCount === 0} className="h-7 gap-1">
            <Save className="size-3.5" />
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      )}

      {/* 日付ナビゲーション */}
      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" className="size-8" onClick={() => onNavigate("prev")}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => onNavigate("today")}>
          今日
        </Button>
        <Button size="icon" variant="outline" className="size-8" onClick={() => onNavigate("next")}>
          <ChevronRight className="size-4" />
        </Button>
        <span className="text-sm font-medium ml-1 min-w-28">
          {formatPeriodLabel(startDate, viewMode)}
        </span>
      </div>

      {/* 表示モード */}
      <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as GanttViewMode)}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">月表示</SelectItem>
          <SelectItem value="3month">3か月</SelectItem>
          <SelectItem value="6month">6か月</SelectItem>
          <SelectItem value="3day">3日間</SelectItem>
        </SelectContent>
      </Select>

      {/* 営業所フィルタ */}
      <Select value={officeId} onValueChange={onOfficeChange}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue placeholder="全営業所" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全営業所</SelectItem>
          {offices.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.officeName}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 車両クラスフィルタ */}
      <Select value={vehicleClassId} onValueChange={onVehicleClassChange}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue placeholder="全クラス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全クラス</SelectItem>
          {vehicleClasses.map((vc) => (
            <SelectItem key={vc.id} value={vc.id}>{vc.className}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
