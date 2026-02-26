"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DashboardFiltersProps {
  fiscalYear: number;
  month: number | null;
  area: string | null;
  applyExclusions: boolean;
  availableAreas: string[];
}

const MONTHS = [
  { value: "all", label: "全月" },
  { value: "4", label: "4月" },
  { value: "5", label: "5月" },
  { value: "6", label: "6月" },
  { value: "7", label: "7月" },
  { value: "8", label: "8月" },
  { value: "9", label: "9月" },
  { value: "10", label: "10月" },
  { value: "11", label: "11月" },
  { value: "12", label: "12月" },
  { value: "1", label: "1月" },
  { value: "2", label: "2月" },
  { value: "3", label: "3月" },
];

export function DashboardFilters({
  fiscalYear,
  month,
  area,
  applyExclusions,
  availableAreas,
}: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* 会計年度 */}
      <div className="flex items-center gap-2">
        <Label className="text-sm whitespace-nowrap">年度</Label>
        <Select
          value={String(fiscalYear)}
          onValueChange={(v) => updateParam("fy", v)}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2023, 2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}年度
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 月 */}
      <div className="flex items-center gap-2">
        <Label className="text-sm whitespace-nowrap">月</Label>
        <Select
          value={month ? String(month) : "all"}
          onValueChange={(v) => updateParam("month", v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* エリア */}
      <div className="flex items-center gap-2">
        <Label className="text-sm whitespace-nowrap">エリア</Label>
        <Select
          value={area ?? "all"}
          onValueChange={(v) => updateParam("area", v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全エリア</SelectItem>
            {availableAreas.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 除外条件 */}
      <div className="flex items-center gap-2">
        <Switch
          id="exclusions"
          checked={applyExclusions}
          onCheckedChange={(checked) =>
            updateParam("exclude", checked ? "1" : null)
          }
        />
        <Label htmlFor="exclusions" className="text-sm whitespace-nowrap">
          除外条件適用
        </Label>
      </div>

      {isPending && (
        <span className="text-xs text-muted-foreground animate-pulse">
          更新中...
        </span>
      )}
    </div>
  );
}
