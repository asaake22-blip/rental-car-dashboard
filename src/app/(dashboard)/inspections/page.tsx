import { inspectionService } from "@/lib/services/inspection-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type InspectionRow } from "./columns";
import { parseSearchParams } from "@/lib/data-table/parse-search-params";
import { buildSearchWhere, searchConfigs } from "@/lib/data-table/search-configs";
import { InspectionsHeader } from "./inspections-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InspectionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = parseSearchParams(sp, {
    defaultSortBy: "scheduledDate",
    defaultSortOrder: "asc",
  });

  // 点検種別フィルタ
  const typeParam = typeof sp.type === "string" ? sp.type : null;
  const typeFilter: Record<string, unknown> = {};
  if (typeParam && ["REGULAR", "LEGAL", "SHAKEN", "MAINTENANCE"].includes(typeParam)) {
    typeFilter.inspectionType = typeParam;
  }

  // 未実施のみフィルタ
  const pendingOnly = sp.pendingOnly === "true";
  const pendingFilter: Record<string, unknown> = {};
  if (pendingOnly) {
    pendingFilter.isCompleted = false;
  }

  const searchWhere = buildSearchWhere(params.search, searchConfigs.inspection.searchableColumns);
  const where = { ...typeFilter, ...pendingFilter, ...searchWhere };

  const allowedSortColumns = [
    "scheduledDate", "completedDate", "inspectionType", "isCompleted",
  ];
  const orderByColumn = allowedSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "scheduledDate";

  const { data: inspections, total: totalCount } = await inspectionService.list({
    where,
    orderBy: { [orderByColumn]: params.sortOrder },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  });

  const totalPages = Math.ceil(totalCount / params.pageSize);

  const rows: InspectionRow[] = inspections.map((i) => {
    const insp = i as unknown as {
      id: string;
      vehicleId: string;
      inspectionType: string;
      scheduledDate: Date;
      completedDate: Date | null;
      isCompleted: boolean;
      note: string | null;
      vehicle: { vehicleCode: string; plateNumber: string | null };
    };
    return {
      id: insp.id,
      vehicleId: insp.vehicleId,
      vehicleCode: insp.vehicle.vehicleCode,
      plateNumber: insp.vehicle.plateNumber,
      inspectionType: insp.inspectionType as InspectionRow["inspectionType"],
      scheduledDate: insp.scheduledDate.toISOString().split("T")[0],
      completedDate: insp.completedDate
        ? insp.completedDate.toISOString().split("T")[0]
        : null,
      isCompleted: insp.isCompleted,
      note: insp.note,
    };
  });

  return (
    <div className="space-y-6">
      <InspectionsHeader inspectionType={typeParam} pendingOnly={pendingOnly} />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="車両ナンバーで検索..."
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
