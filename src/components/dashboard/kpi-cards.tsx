"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, ShoppingCart, DollarSign, Target, AlertCircle, Banknote, CheckCircle2, Plane, MapPin, Car, Gauge } from "lucide-react";
import type { KpiData } from "@/lib/dashboard/types";
import { formatAmount } from "@/lib/dashboard/chart-configs";

interface KpiCardsProps {
  data: KpiData;
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-xs text-muted-foreground">--</span>;
  const ratio = Math.round((current / previous) * 100);
  const diff = ratio - 100;

  if (diff > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-green-600">
        <ArrowUp className="size-3" />
        +{diff}%
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-600">
        <ArrowDown className="size-3" />
        {diff}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="size-3" />
      0%
    </span>
  );
}

export function KpiCards({ data }: KpiCardsProps) {
  const reservationAchievement = data.reservationTarget > 0
    ? Math.round((data.reservationCount / data.reservationTarget) * 100)
    : 0;
  const salesAchievement = data.salesTarget > 0
    ? Math.round((data.salesAmount / data.salesTarget) * 100)
    : 0;

  const cards = [
    {
      title: "予約件数",
      value: data.reservationCount.toLocaleString(),
      unit: "件",
      icon: ShoppingCart,
      trend: <TrendIndicator current={data.reservationCount} previous={data.reservationCountPrev} />,
      description: "前月比",
    },
    {
      title: "売上金額",
      value: formatAmount(data.salesAmount),
      unit: "円",
      icon: DollarSign,
      trend: <TrendIndicator current={data.salesAmount} previous={data.salesAmountPrev} />,
      description: "前月比",
    },
    {
      title: "予約目標達成率",
      value: `${reservationAchievement}`,
      unit: "%",
      icon: Target,
      trend: (
        <span className="text-xs text-muted-foreground">
          {data.reservationCount} / {data.reservationTarget} 件
        </span>
      ),
      description: "実績 / 目標",
    },
    {
      title: "売上目標達成率",
      value: `${salesAchievement}`,
      unit: "%",
      icon: Target,
      trend: (
        <span className="text-xs text-muted-foreground">
          {formatAmount(data.salesAmount)} / {formatAmount(data.salesTarget)}
        </span>
      ),
      description: "実績 / 目標",
    },
    {
      title: "未承認件数",
      value: data.pendingCount.toLocaleString(),
      unit: "件",
      icon: AlertCircle,
      trend: data.pendingCount > 0 ? (
        <span className="text-xs text-amber-600">要対応</span>
      ) : (
        <span className="text-xs text-green-600">なし</span>
      ),
      description: "予約",
    },
    {
      title: "未入金額",
      value: formatAmount(data.unpaidAmount),
      unit: "円",
      icon: Banknote,
      trend: data.unpaidAmount > 0 ? (
        <span className="text-xs text-amber-600">未回収あり</span>
      ) : (
        <span className="text-xs text-green-600">全額回収済</span>
      ),
      description: "精算済売上 - 消込済",
    },
    {
      title: "消込率",
      value: `${data.allocationRate}`,
      unit: "%",
      icon: CheckCircle2,
      trend: data.allocationRate >= 90 ? (
        <span className="text-xs text-green-600">良好</span>
      ) : data.allocationRate >= 70 ? (
        <span className="text-xs text-amber-600">要確認</span>
      ) : (
        <span className="text-xs text-red-600">要対応</span>
      ),
      description: "消込済 / 精算済売上",
    },
    {
      title: "本日出発予定",
      value: data.todayDepartures.toLocaleString(),
      unit: "件",
      icon: Plane,
      trend: data.todayDepartures > 0 ? (
        <span className="text-xs text-blue-600">予定あり</span>
      ) : (
        <span className="text-xs text-muted-foreground">なし</span>
      ),
      description: "CONFIRMED",
    },
    {
      title: "本日帰着予定",
      value: data.todayReturns.toLocaleString(),
      unit: "件",
      icon: MapPin,
      trend: data.todayReturns > 0 ? (
        <span className="text-xs text-blue-600">予定あり</span>
      ) : (
        <span className="text-xs text-muted-foreground">なし</span>
      ),
      description: "DEPARTED",
    },
    {
      title: "現在貸出中",
      value: data.currentRentals.toLocaleString(),
      unit: "件",
      icon: Car,
      trend: (
        <span className="text-xs text-muted-foreground">稼働中車両</span>
      ),
      description: "DEPARTED ステータス",
    },
    {
      title: "車両稼働率",
      value: `${data.utilizationRate}`,
      unit: "%",
      icon: Gauge,
      trend: data.utilizationRate >= 80 ? (
        <span className="text-xs text-green-600">高稼働</span>
      ) : data.utilizationRate >= 50 ? (
        <span className="text-xs text-amber-600">通常</span>
      ) : (
        <span className="text-xs text-muted-foreground">低稼働</span>
      ),
      description: "貸出中 / 稼働可能車両",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{card.value}</span>
              <span className="text-sm text-muted-foreground">{card.unit}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {card.trend}
              <span className="text-xs text-muted-foreground">{card.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
