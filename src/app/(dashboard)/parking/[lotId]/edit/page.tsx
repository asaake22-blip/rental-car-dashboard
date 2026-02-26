import { notFound } from "next/navigation";
import { parkingService } from "@/lib/services/parking-service";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { ParkingLotEditForm } from "./parking-lot-edit-form";
import type { Annotation } from "@/components/parking/spot-editor-types";

interface PageProps {
  params: Promise<{ lotId: string }>;
}

export default async function ParkingLotEditPage({ params }: PageProps) {
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
    }>;
    annotations: unknown;
  };

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "駐車場マップ", href: "/parking" },
          { label: l.name, href: `/parking/${l.id}` },
          { label: "編集" },
        ]}
      />

      <ParkingLotEditForm
        lot={{
          id: l.id,
          name: l.name,
          officeId: l.officeId,
          canvasWidth: l.canvasWidth,
          canvasHeight: l.canvasHeight,
          officeName: l.office.officeName,
        }}
        spots={l.spots.map((s) => ({
          id: s.id,
          spotNumber: s.spotNumber,
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height,
          rotation: s.rotation,
        }))}
        annotations={Array.isArray(l.annotations) ? l.annotations as Annotation[] : []}
      />
    </div>
  );
}
