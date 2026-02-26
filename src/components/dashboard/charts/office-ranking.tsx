"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { officeRankingConfig } from "@/lib/dashboard/chart-configs";
import type { OfficeRankingItem } from "@/lib/dashboard/types";

interface OfficeRankingChartProps {
  data: OfficeRankingItem[];
}

/** 達成率に応じた色を返す */
function getBarColor(rate: number): string {
  const { thresholds } = officeRankingConfig;
  for (const t of thresholds) {
    if (rate >= t.min) return t.color;
  }
  return thresholds[thresholds.length - 1].color;
}

export function OfficeRankingChart({ data }: OfficeRankingChartProps) {
  const config = officeRankingConfig;

  const chartData = data.map((d) => ({
    name: d.officeName,
    achievementRate: d.achievementRate,
    salesActual: Math.round(d.salesActual / config.divider),
    salesTarget: Math.round(d.salesTarget / config.divider),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={config.height}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" fontSize={config.xAxis.fontSize} unit="%" />
            <YAxis
              type="category"
              dataKey="name"
              fontSize={config.yAxis.fontSize}
              width={config.yAxis.width}
              tick={{ fill: config.yAxis.color }}
            />
            <Tooltip
              formatter={(value) => `${value}%`}
              labelFormatter={(label) => `${label}`}
            />
            <ReferenceLine
              x={config.referenceLine.value}
              stroke={config.referenceLine.color}
              strokeDasharray="3 3"
            />
            <Bar dataKey="achievementRate" name="達成率" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.achievementRate)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
