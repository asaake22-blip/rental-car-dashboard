"use client";

import { useTransition, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignVehicleToSpot, getVehiclesForAssignment } from "@/app/actions/parking";
import { toast } from "sonner";
import type { SpotData } from "@/components/parking/parking-map";

interface VehicleAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spot: SpotData;
  officeId: string;
}

interface VehicleOption {
  id: string;
  vehicleCode: string;
  plateNumber: string | null;
  maker: string;
  modelName: string;
}

export function VehicleAssignDialog({ open, onOpenChange, spot, officeId }: VehicleAssignDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    spot.vehicle?.id ?? "__none__"
  );
  const [loading, setLoading] = useState(false);

  // 営業所の車両リストを Server Action で取得
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedVehicleId(spot.vehicle?.id ?? "__none__");
    getVehiclesForAssignment(officeId)
      .then((result) => {
        if (result.success && result.data) {
          setVehicles(result.data);
        }
      })
      .catch(() => {
        toast.error("車両リストの取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, [open, officeId, spot.vehicle?.id]);

  const handleAssign = () => {
    startTransition(async () => {
      const vehicleId = selectedVehicleId === "__none__" ? null : selectedVehicleId;
      const result = await assignVehicleToSpot(spot.id, vehicleId);
      if (result.success) {
        toast.success(vehicleId ? "車両を割り当てました" : "車両の割当を解除しました");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>車両割当 — {spot.spotNumber}</DialogTitle>
          <DialogDescription>
            この区画に割り当てる車両を選択してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Select
            value={selectedVehicleId}
            onValueChange={setSelectedVehicleId}
            disabled={loading || isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "読み込み中..." : "車両を選択"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">割当なし（空き）</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.vehicleCode} {v.plateNumber ? `(${v.plateNumber})` : ""} - {v.maker} {v.modelName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={handleAssign} disabled={isPending || loading}>
            {isPending ? "処理中..." : "割り当て"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
