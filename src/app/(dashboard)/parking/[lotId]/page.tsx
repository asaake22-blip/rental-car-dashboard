import { notFound } from "next/navigation";
import { parkingService } from "@/lib/services/parking-service";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { ParkingMapView } from "./parking-map-view";
import type { Annotation } from "@/components/parking/spot-editor-types";

interface PageProps {
  params: Promise<{ lotId: string }>;
}

export default async function ParkingLotPage({ params }: PageProps) {
  const { lotId } = await params;

  const lot = await parkingService.getLot(lotId);
  if (!lot) {
    notFound();
  }

  const l = lot as unknown as {
    id: string;
    name: string;
    officeId: string;
    canvasWidth: number;
    canvasHeight: number;
    office: { officeName: string };
    spots: Array<{
      id: string;
      spotNumber: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      vehicle: {
        id: string;
        vehicleCode: string;
        plateNumber: string | null;
        maker: string;
        modelName: string;
        status: string;
      } | null;
    }>;
    annotations: unknown;
  };

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "駐車場マップ", href: "/parking" },
          { label: l.name },
        ]}
      />

      <ParkingMapView
        lotId={l.id}
        lotName={l.name}
        officeName={l.office.officeName}
        officeId={l.officeId}
        canvasWidth={l.canvasWidth}
        canvasHeight={l.canvasHeight}
        spots={l.spots}
        annotations={Array.isArray(l.annotations) ? l.annotations as Annotation[] : []}
      />
    </div>
  );
}
