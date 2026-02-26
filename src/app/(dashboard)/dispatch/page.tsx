/**
 * 配車表（ガントチャート）ページ
 *
 * 車両ごとの予約状況をガントチャートで表示。
 * ドラッグで予約期間を変更可能。
 */

import { prisma } from "@/lib/prisma";
import { GanttChart } from "@/components/gantt/gantt-chart";

export default async function DispatchPage() {
  // 営業所と車両クラスをフィルタ用に取得
  const [offices, vehicleClasses] = await Promise.all([
    prisma.office.findMany({
      orderBy: { officeName: "asc" },
      select: { id: true, officeName: true },
    }),
    prisma.vehicleClass.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, className: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">配車表</h1>
        <p className="text-sm text-muted-foreground">
          車両ごとの予約状況を確認・管理できます。予約バーの端をドラッグして期間を変更できます。
        </p>
      </div>
      <GanttChart offices={offices} vehicleClasses={vehicleClasses} />
    </div>
  );
}
