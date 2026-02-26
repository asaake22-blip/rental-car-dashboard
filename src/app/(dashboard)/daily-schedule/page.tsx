import { prisma } from "@/lib/prisma";
import { DailyScheduleClient } from "./daily-schedule-client";

export default async function DailySchedulePage() {
  // 営業所一覧（フィルタ用）
  const offices = await prisma.office.findMany({
    orderBy: { officeName: "asc" },
    select: { id: true, officeName: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">業務予定表</h1>
        <p className="text-sm text-muted-foreground">
          本日の出発・帰着予定
        </p>
      </div>
      <DailyScheduleClient offices={offices} />
    </div>
  );
}
