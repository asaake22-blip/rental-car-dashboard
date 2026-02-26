// 月別売上推移チャートの設定

import { COLORS } from "./shared";
import type { SeriesConfig } from "./shared";

export const monthlySalesConfig = {
  title: "月別売上推移",
  height: 300,
  xAxis: { fontSize: 12 },
  yAxis: { fontSize: 12 },
  yAxisUnit: "万",
  tooltipUnit: "万円",
  /** 売上金額を万円単位に変換する係数 */
  divider: 10_000,
  series: [
    {
      dataKey: "salesActualMan",
      name: "売上実績",
      color: COLORS.green,
      type: "solid",
      dot: true,
    },
    {
      dataKey: "salesTargetMan",
      name: "売上目標",
      color: COLORS.green,
      type: "dashed",
      opacity: 0.5,
    },
  ] satisfies SeriesConfig[],
} as const;
