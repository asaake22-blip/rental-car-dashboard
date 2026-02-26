"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ParkingMap, type SpotData } from "@/components/parking/parking-map";
import type { Annotation } from "@/components/parking/spot-editor-types";
import { VehicleAssignDialog } from "./vehicle-assign-dialog";
import { JsonImportDialog } from "./json-import-dialog";
import { ParkingLotDeleteDialog } from "./parking-lot-delete-dialog";

interface ParkingMapViewProps {
  lotId: string;
  lotName: string;
  officeName: string;
  officeId: string;
  canvasWidth: number;
  canvasHeight: number;
  spots: SpotData[];
  annotations?: Annotation[];
}

export function ParkingMapView({
  lotId,
  lotName,
  officeName,
  officeId,
  canvasWidth,
  canvasHeight,
  spots,
  annotations = [],
}: ParkingMapViewProps) {
  const router = useRouter();
  const [selectedSpot, setSelectedSpot] = useState<SpotData | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const occupied = spots.filter((s) => s.vehicle).length;
  const total = spots.length;

  const handleSpotClick = (spot: SpotData) => {
    setSelectedSpot(spot);
    setAssignOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lotName}</h1>
          <p className="text-muted-foreground">{officeName}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{total} 区画</Badge>
            <Badge variant="default">{occupied} 使用中</Badge>
            <Badge variant="secondary">{total - occupied} 空き</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            JSON インポート
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/parking/${lotId}/edit`)}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            編集
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            削除
          </Button>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border-2 border-blue-500 bg-blue-100" />
          車両あり
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border-2 border-yellow-400 bg-yellow-100" />
          整備中
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border-2 border-gray-300 bg-gray-50" />
          空き
        </span>
      </div>

      <ParkingMap
        spots={spots}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        onSpotClick={handleSpotClick}
        annotations={annotations}
      />

      {selectedSpot && (
        <VehicleAssignDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          spot={selectedSpot}
          officeId={officeId}
        />
      )}

      <JsonImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        lotId={lotId}
      />

      <ParkingLotDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        lotId={lotId}
        lotName={lotName}
      />
    </div>
  );
}
