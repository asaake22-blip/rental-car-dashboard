"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { monthlyReservationConfig, monthlySalesConfig } from "@/lib/dashboard/chart-configs";
import type { MonthlyTrendItem } from "@/lib/dashboard/types";

interface MonthlyTrendChartProps {
  data: MonthlyTrendItem[];
}

export function MonthlyReservationTrend({ data }: MonthlyTrendChartProps) {
  const config = monthlyReservationConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={config.height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={config.xAxis.fontSize} />
            <YAxis fontSize={config.yAxis.fontSize} />
            <Tooltip />
            <Legend />
            {config.series.map((s) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.type === "dashed" ? "5 5" : undefined}
                dot={s.dot ? { r: 4 } : false}
                opacity={s.opacity ?? 1}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function MonthlySalesTrend({ data }: MonthlyTrendChartProps) {
  const config = monthlySalesConfig;

  const chartData = data.map((d) => ({
    ...d,
    salesActualMan: Math.round(d.salesActual / config.divider),
    salesTargetMan: Math.round(d.salesTarget / config.divider),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={config.height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={config.xAxis.fontSize} />
            <YAxis fontSize={config.yAxis.fontSize} tickFormatter={(v) => `${v}${config.yAxisUnit}`} />
            <Tooltip formatter={(value) => `${Number(value).toLocaleString()}${config.tooltipUnit}`} />
            <Legend />
            {config.series.map((s) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.type === "dashed" ? "5 5" : undefined}
                dot={s.dot ? { r: 4 } : false}
                opacity={s.opacity ?? 1}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
