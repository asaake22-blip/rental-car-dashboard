// エリア別売上構成チャートの設定

import { COLORS } from "./shared";

export const areaBreakdownConfig = {
  title: "エリア別売上構成",
  height: 300,
  /** ドーナツチャートの色パレット（エリア数分） */
  palette: [
    COLORS.blue,
    COLORS.green,
    COLORS.orange,
    COLORS.purple,
    COLORS.cyan,
    COLORS.amber,
    COLORS.red,
    COLORS.indigo,
    COLORS.lime,
    COLORS.rose,
  ],
  pie: {
    innerRadius: 60,
    outerRadius: 100,
    paddingAngle: 2,
  },
  labelFontSize: 11,
  /** Tooltip の金額変換係数（万円単位） */
  tooltipDivider: 10_000,
  tooltipUnit: "万円",
} as const;
