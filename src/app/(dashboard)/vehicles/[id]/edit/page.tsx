import { notFound } from "next/navigation";
import { vehicleService } from "@/lib/services/vehicle-service";
import { VehicleEditForm } from "./vehicle-edit-form";
import type { VehicleRow } from "../../columns";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VehicleEditPage({ params }: PageProps) {
  const { id } = await params;

  const vehicle = await vehicleService.get(id);

  if (!vehicle) {
    notFound();
  }

  const v = vehicle as unknown as {
    id: string;
    vehicleCode: string;
    plateNumber: string | null;
    vin: string | null;
    maker: string;
    modelName: string;
    year: number;
    color: string | null;
    mileage: number;
    status: string;
    officeId: string;
  };

  const vehicleRow: VehicleRow = {
    id: v.id,
    vehicleCode: v.vehicleCode,
    plateNumber: v.plateNumber,
    vin: v.vin,
    maker: v.maker,
    modelName: v.modelName,
    year: v.year,
    color: v.color,
    mileage: v.mileage,
    status: v.status as VehicleRow["status"],
    officeId: v.officeId,
    officeName: null,
  };

  return <VehicleEditForm vehicle={vehicleRow} />;
}
