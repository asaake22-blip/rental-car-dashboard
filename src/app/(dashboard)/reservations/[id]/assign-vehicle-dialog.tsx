"use client";

/**
 * 車両割当ダイアログ
 *
 * 同じ車両クラスで空いている車両（IN_STOCK）の一覧を表示し、
 * 選択して割当を実行する。
 */

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { assignVehicle, getAvailableVehicles } from "@/app/actions/reservation";
import { toast } from "sonner";

interface AvailableVehicle {
  id: string;
  vehicleCode: string;
  maker: string;
  modelName: string;
  plateNumber: string | null;
}

interface AssignVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  vehicleClassId: string;
}

export function AssignVehicleDialog({
  open,
  onOpenChange,
  reservationId,
  vehicleClassId,
}: AssignVehicleDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [vehicles, setVehicles] = useState<AvailableVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ダイアログが開かれたときに利用可能な車両を取得
  useEffect(() => {
    if (!open) {
      setSelectedVehicleId(null);
      setErrorMessage(null);
      return;
    }

    setLoading(true);
    // Server Action で車両クラスに属する空き車両を取得
    getAvailableVehicles(vehicleClassId)
      .then((result) => {
        if (result.success && result.data) {
          setVehicles(result.data);
        } else {
          setVehicles([]);
        }
      })
      .catch(() => {
        setVehicles([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, vehicleClassId]);

  const handleAssign = () => {
    if (!selectedVehicleId) return;

    setErrorMessage(null);
    startTransition(async () => {
      const result = await assignVehicle(reservationId, selectedVehicleId);
      if (result.success) {
        toast.success("車両を割当しました");
        onOpenChange(false);
      } else {
        setErrorMessage(result.error);
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>車両を割当</DialogTitle>
          <DialogDescription>
            同じ車両クラスの空き車両から割当する車両を選択してください。
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">車両を読み込み中...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">
              割当可能な車両がありません。
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1">
            {vehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setSelectedVehicleId(vehicle.id)}
                className={`w-full text-left rounded-md border p-3 transition-colors ${
                  selectedVehicleId === vehicle.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{vehicle.vehicleCode}</p>
                    <p className="text-xs text-muted-foreground">
                      {vehicle.maker} {vehicle.modelName}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {vehicle.plateNumber ?? "ナンバー未登録"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={isPending || !selectedVehicleId || loading}
          >
            {isPending ? "割当中..." : "割当する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
