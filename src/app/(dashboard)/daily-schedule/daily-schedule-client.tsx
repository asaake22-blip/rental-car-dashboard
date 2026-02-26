"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Truck, MapPin, Clock } from "lucide-react";
import Link from "next/link";

interface Office {
  id: string;
  officeName: string;
}

interface ScheduleItem {
  id: string;
  reservationCode: string;
  customerName: string;
  pickupDate: string;
  returnDate: string;
  vehicle: {
    id: string;
    vehicleCode: string;
  } | null;
  vehicleClass: {
    id: string;
    className: string;
  };
  pickupOffice: {
    id: string;
    officeName: string;
  };
  returnOffice: {
    id: string;
    officeName: string;
  };
}

interface ScheduleData {
  departures: ScheduleItem[];
  returns: ScheduleItem[];
  date: string;
}

interface DailyScheduleClientProps {
  offices: Office[];
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${y}年${m}月${d}日(${w})`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function ScheduleCard({
  item,
  type,
}: {
  item: ScheduleItem;
  type: "departure" | "return";
}) {
  const time =
    type === "departure"
      ? formatTime(item.pickupDate)
      : formatTime(item.returnDate);
  const officeName =
    type === "departure"
      ? item.pickupOffice.officeName
      : item.returnOffice.officeName;

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <div className="p-4 flex items-start gap-4">
        <div className="flex-shrink-0 text-center min-w-[50px]">
          <Clock className="size-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-lg font-bold">{time}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/reservations/${item.id}`}
              className="font-medium text-primary hover:underline"
            >
              {item.reservationCode}
            </Link>
            <span className="text-sm text-muted-foreground">
              {item.customerName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <Truck className="size-3.5 flex-shrink-0" />
            <span>
              {item.vehicle?.vehicleCode ?? "未配車"} (
              {item.vehicleClass.className})
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
            <MapPin className="size-3.5 flex-shrink-0" />
            <span>{officeName}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function DailyScheduleClient({ offices }: DailyScheduleClientProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [officeFilter, setOfficeFilter] = useState<string>("all");
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/daily-schedule?date=${formatDate(date)}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // エラー時は空データ
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentDate);
  }, [currentDate, fetchData]);

  const goToPrev = () => {
    setCurrentDate(
      (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToNext = () => {
    setCurrentDate(
      (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    );
  };

  // 営業所フィルタ適用
  const filteredDepartures = (data?.departures ?? []).filter((item) => {
    if (officeFilter === "all") return true;
    return item.pickupOffice.id === officeFilter;
  });

  const filteredReturns = (data?.returns ?? []).filter((item) => {
    if (officeFilter === "all") return true;
    return item.returnOffice.id === officeFilter;
  });

  return (
    <div className="space-y-4">
      {/* ナビゲーション + フィルタ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant={isToday(currentDate) ? "default" : "outline"}
            size="sm"
            onClick={goToToday}
          >
            今日
          </Button>
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-lg font-semibold ml-2">
            {formatDisplayDate(currentDate)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">営業所:</span>
          <Select value={officeFilter} onValueChange={setOfficeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="全営業所" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全営業所</SelectItem>
              {offices.map((office) => (
                <SelectItem key={office.id} value={office.id}>
                  {office.officeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      )}

      {/* データ表示 */}
      {!loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 出発予定 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">出発予定</h2>
              <Badge variant="secondary">
                {filteredDepartures.length} 件
              </Badge>
            </div>
            {filteredDepartures.length === 0 ? (
              <Card>
                <div className="p-6 text-center text-muted-foreground">
                  出発予定はありません
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredDepartures.map((item) => (
                  <ScheduleCard
                    key={item.id}
                    item={item}
                    type="departure"
                  />
                ))}
              </div>
            )}
          </div>

          {/* 帰着予定 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">帰着予定</h2>
              <Badge variant="secondary">
                {filteredReturns.length} 件
              </Badge>
            </div>
            {filteredReturns.length === 0 ? (
              <Card>
                <div className="p-6 text-center text-muted-foreground">
                  帰着予定はありません
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredReturns.map((item) => (
                  <ScheduleCard key={item.id} item={item} type="return" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
