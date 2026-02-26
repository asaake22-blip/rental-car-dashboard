import { notFound } from "next/navigation";
import { vehicleService } from "@/lib/services/vehicle-service";
import { inspectionService } from "@/lib/services/inspection-service";
import { VehicleDetailClient } from "./vehicle-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { id } = await params;

  const vehicle = await vehicleService.get(id);

  if (!vehicle) {
    notFound();
  }

  // 関連データを並列取得
  const [allInspections, related] = await Promise.all([
    inspectionService.listByVehicle(id),
    vehicleService.getRelatedRecords(id),
  ]);

  const v = vehicle as any;
  const rel = related as any;

  // Date → ISO文字列に変換してシリアライズ可能にする
  const toISO = (d: unknown) =>
    d instanceof Date ? d.toISOString() : typeof d === "string" ? d : "";

  const serializedVehicle = {
    id: v.id,
    vehicleCode: v.vehicleCode,
    plateNumber: v.plateNumber,
    vin: v.vin,
    maker: v.maker,
    modelName: v.modelName,
    year: v.year,
    color: v.color,
    mileage: v.mileage,
    status: v.status,
    officeId: v.officeId,
    office: v.office ? { officeName: v.office.officeName, area: v.office.area } : null,
    parkingSpot: v.parkingSpot
      ? {
          name: v.parkingSpot.name,
          parkingLot: { id: v.parkingSpot.parkingLot.id, name: v.parkingSpot.parkingLot.name },
        }
      : null,
    createdAt: toISO(v.createdAt),
    updatedAt: toISO(v.updatedAt),
  };

  const serializedReservations = (rel.reservations ?? []).map((r: any) => ({
    id: r.id,
    reservationCode: r.reservationCode,
    pickupDate: toISO(r.pickupDate),
    customerName: r.customerName,
    actualAmount: r.actualAmount,
    approvalStatus: r.approvalStatus,
  }));

  const serializedLeaseLines = (rel.leaseLines ?? []).map((l: any) => ({
    id: l.id,
    startDate: toISO(l.startDate),
    endDate: toISO(l.endDate),
    monthlyAmount: l.monthlyAmount,
    contract: {
      id: l.contract.id,
      contractNumber: l.contract.contractNumber,
      lesseeName: l.contract.lesseeName,
      status: l.contract.status,
    },
  }));

  const typedInspections = (allInspections as any[]).map((i) => ({
    id: i.id,
    inspectionType: i.inspectionType,
    scheduledDate: toISO(i.scheduledDate),
    isCompleted: i.isCompleted,
  }));

  // 次回点検予定（未完了で最も近い予定日）
  const nextInspection =
    typedInspections
      .filter((i) => !i.isCompleted)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0] ?? null;

  return (
    <VehicleDetailClient
      vehicle={serializedVehicle}
      reservations={serializedReservations}
      reservationsCount={rel.reservationsCount ?? serializedReservations.length}
      leaseLines={serializedLeaseLines.slice(0, 5)}
      leaseLinesCount={rel.leaseLinesCount ?? serializedLeaseLines.length}
      inspections={typedInspections.slice(0, 5)}
      nextInspection={
        nextInspection
          ? { inspectionType: nextInspection.inspectionType, scheduledDate: nextInspection.scheduledDate }
          : null
      }
    />
  );
}
