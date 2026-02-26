"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleDeleteDialog } from "../vehicle-delete-dialog";

interface VehicleDetailActionsProps {
  id: string;
  vehicleCode: string;
}

export function VehicleDetailActions({ id, vehicleCode }: VehicleDetailActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/vehicles")}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          車両一覧に戻る
        </Button>

        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{vehicleCode}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/vehicles/${id}/edit`)}
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
      </div>

      <VehicleDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        vehicleId={id}
        vehicleCode={vehicleCode}
      />
    </>
  );
}
