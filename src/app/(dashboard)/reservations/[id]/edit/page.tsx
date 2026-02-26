import { notFound, redirect } from "next/navigation";
import { reservationService } from "@/lib/services/reservation-service";
import { vehicleClassService } from "@/lib/services/vehicle-class-service";
import { officeService } from "@/lib/services/office-service";
import { ReservationEditForm } from "./reservation-edit-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservationEditPage({ params }: PageProps) {
  const { id } = await params;

  const reservation = await reservationService.get(id);

  if (!reservation) {
    notFound();
  }

  const r = reservation as any;

  // RESERVED / CONFIRMED 以外は編集不可 -> 詳細ページにリダイレクト
  if (r.status !== "RESERVED" && r.status !== "CONFIRMED") {
    redirect(`/reservations/${id}`);
  }

  // 車両クラスと営業所の選択肢を並列取得
  const [vehicleClassResult, officeResult] = await Promise.all([
    vehicleClassService.list({ orderBy: { sortOrder: "asc" } }),
    officeService.list({ orderBy: { officeName: "asc" } }),
  ]);

  const vehicleClasses = vehicleClassResult.data.map((vc: any) => ({
    id: vc.id,
    className: vc.className,
  }));

  const offices = officeResult.data.map((o: any) => ({
    id: o.id,
    officeName: o.officeName,
  }));

  const reservationData = {
    id: r.id,
    reservationCode: r.reservationCode,
    vehicleClassId: r.vehicleClassId,
    customerName: r.customerName,
    customerNameKana: r.customerNameKana,
    customerPhone: r.customerPhone,
    customerEmail: r.customerEmail,
    pickupDate: r.pickupDate instanceof Date ? r.pickupDate.toISOString() : r.pickupDate,
    returnDate: r.returnDate instanceof Date ? r.returnDate.toISOString() : r.returnDate,
    pickupOfficeId: r.pickupOfficeId,
    returnOfficeId: r.returnOfficeId,
    estimatedAmount: r.estimatedAmount,
    note: r.note,
    customerCode: r.customerCode,
    entityType: r.entityType,
    companyCode: r.companyCode,
    channel: r.channel,
  };

  return (
    <ReservationEditForm
      reservation={reservationData}
      vehicleClasses={vehicleClasses}
      offices={offices}
    />
  );
}
