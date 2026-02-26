import { ratePlanService } from "@/lib/services/rate-plan-service";
import { vehicleClassService } from "@/lib/services/vehicle-class-service";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { RatePlanHeader } from "./rate-plan-header";
import { RatePlanTable } from "./rate-plan-table";
import type { RatePlanRow } from "./columns";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RatePlansPage({ searchParams }: PageProps) {
  const params = parseSearchParams(await searchParams, {
    defaultSortBy: "planName",
    defaultSortOrder: "asc",
  });

  const searchWhere = buildSearchWhere(params.search, searchConfigs.ratePlan.searchableColumns);
  const where = searchWhere ?? {};

  const allowedSortColumns = ["planName", "rateType", "basePrice", "validFrom", "isActive"];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "planName";

  const [{ data: ratePlans, total: totalCount }, { data: vehicleClasses }] = await Promise.all([
    ratePlanService.list({
      where,
      orderBy: { [orderByColumn]: params.sortOrder },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    vehicleClassService.list({
      orderBy: { sortOrder: "asc" },
      take: 1000,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / params.pageSize);

  const vcMap = new Map(
    vehicleClasses.map((vc) => [vc.id, (vc as { id: string; className: string }).className])
  );

  const rows: RatePlanRow[] = ratePlans.map((rp) => {
    const plan = rp as unknown as {
      id: string;
      planName: string;
      vehicleClassId: string;
      rateType: "HOURLY" | "DAILY" | "OVERNIGHT";
      basePrice: number;
      additionalHourPrice: number;
      insurancePrice: number;
      validFrom: Date;
      validTo: Date | null;
      isActive: boolean;
    };
    return {
      id: plan.id,
      planName: plan.planName,
      vehicleClassId: plan.vehicleClassId,
      vehicleClassName: vcMap.get(plan.vehicleClassId) ?? "-",
      rateType: plan.rateType,
      basePrice: plan.basePrice,
      additionalHourPrice: plan.additionalHourPrice,
      insurancePrice: plan.insurancePrice,
      validFrom: new Date(plan.validFrom).toISOString().split("T")[0],
      validTo: plan.validTo ? new Date(plan.validTo).toISOString().split("T")[0] : null,
      isActive: plan.isActive,
    };
  });

  const vcOptions = vehicleClasses.map((vc) => ({
    id: vc.id,
    className: (vc as { id: string; className: string }).className,
  }));

  return (
    <div className="space-y-6">
      <RatePlanHeader vehicleClasses={vcOptions} />
      <RatePlanTable
        data={rows}
        vehicleClasses={vcOptions}
        searchPlaceholder="プラン名で検索..."
        totalCount={totalCount}
        page={params.page}
        pageSize={params.pageSize}
        totalPages={totalPages}
        search={params.search}
        sortBy={params.sortBy}
        sortOrder={params.sortOrder}
      />
    </div>
  );
}
