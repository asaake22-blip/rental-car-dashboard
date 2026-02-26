"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { areaBreakdownConfig } from "@/lib/dashboard/chart-configs";
import type { AreaBreakdownItem } from "@/lib/dashboard/types";

interface AreaBreakdownChartProps {
  data: AreaBreakdownItem[];
}

export function AreaBreakdownChart({ data }: AreaBreakdownChartProps) {
  const config = areaBreakdownConfig;

  const chartData = data.map((d) => ({
    name: d.area,
    value: d.salesAmount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={config.height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={config.pie.innerRadius}
              outerRadius={config.pie.outerRadius}
              paddingAngle={config.pie.paddingAngle}
              dataKey="value"
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name ?? ""} ${((percent ?? 0) * 100).toFixed(1)}%`
              }
              labelLine={false}
              fontSize={config.labelFontSize}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={config.palette[index % config.palette.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                `${Math.round(Number(value) / config.tooltipDivider).toLocaleString()}${config.tooltipUnit}`
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
