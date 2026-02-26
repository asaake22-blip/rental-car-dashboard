import { notFound } from "next/navigation";
import { vehicleService } from "@/lib/services/vehicle-service";
import { inspectionService } from "@/lib/services/inspection-service";
import { DataTable } from "@/components/data-table/data-table";
import { columns, type InspectionRow } from "@/app/(dashboard)/inspections/columns";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VehicleInspectionsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const vehicle = await vehicleService.get(id);
  if (!vehicle) {
    notFound();
  }

  const v = vehicle as unknown as {
    id: string;
    vehicleCode: string;
    plateNumber: string | null;
  };

  const inspections = await inspectionService.listByVehicle(id);

  const rows: InspectionRow[] = inspections.map((i) => {
    const insp = i as unknown as {
      id: string;
      vehicleId: string;
      inspectionType: string;
      scheduledDate: Date;
      completedDate: Date | null;
      isCompleted: boolean;
      note: string | null;
    };
    return {
      id: insp.id,
      vehicleId: insp.vehicleId,
      vehicleCode: v.vehicleCode,
      plateNumber: v.plateNumber,
      inspectionType: insp.inspectionType as InspectionRow["inspectionType"],
      scheduledDate: insp.scheduledDate.toISOString().split("T")[0],
      completedDate: insp.completedDate ? insp.completedDate.toISOString().split("T")[0] : null,
      isCompleted: insp.isCompleted,
      note: insp.note,
    };
  });

  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / 100));

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "車両一覧", href: "/vehicles" },
          { label: v.vehicleCode, href: `/vehicles/${v.id}` },
          { label: "点検履歴" },
        ]}
      />

      <h2 className="text-2xl font-bold">{v.vehicleCode} の点検・整備履歴</h2>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="備考で検索..."
        totalCount={totalCount}
        page={page}
        pageSize={100}
        totalPages={totalPages}
        search=""
        sortBy="scheduledDate"
        sortOrder="desc"
      />
    </div>
  );
}
