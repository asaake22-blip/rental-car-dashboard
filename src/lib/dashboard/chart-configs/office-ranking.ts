// 営業所別達成率ランキングチャートの設定

import { COLORS } from "./shared";
import type { ThresholdConfig } from "./shared";

export const officeRankingConfig = {
  title: "営業所別 達成率ランキング（TOP10）",
  height: 350,
  /** 表示する上位件数 */
  topN: 10,
  /** 達成率100%のリファレンスライン */
  referenceLine: {
    value: 100,
    color: COLORS.gray400,
  },
  /** 達成率に応じた色分け（min以上でその色を適用、上から評価） */
  thresholds: [
    { min: 100, color: COLORS.green },
    { min: 80, color: COLORS.amber },
    { min: 0, color: COLORS.red },
  ] satisfies ThresholdConfig[],
  xAxis: { fontSize: 12 },
  yAxis: {
    width: 100,
    fontSize: 11,
    color: COLORS.gray700,
  },
  /** 万円単位に変換する係数 */
  divider: 10_000,
} as const;
