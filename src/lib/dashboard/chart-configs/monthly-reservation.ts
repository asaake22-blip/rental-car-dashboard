// 月別予約件数推移チャートの設定

import { COLORS } from "./shared";
import type { SeriesConfig } from "./shared";

export const monthlyReservationConfig = {
  title: "月別予約件数推移",
  height: 300,
  xAxis: { fontSize: 12 },
  yAxis: { fontSize: 12 },
  series: [
    {
      dataKey: "reservationActual",
      name: "予約実績",
      color: COLORS.blue,
      type: "solid",
      dot: true,
    },
    {
      dataKey: "reservationTarget",
      name: "予約目標",
      color: COLORS.blue,
      type: "dashed",
      opacity: 0.5,
    },
  ] satisfies SeriesConfig[],
} as const;
