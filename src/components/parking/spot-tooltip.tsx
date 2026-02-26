import type { SpotData } from "./parking-map";

interface SpotTooltipProps {
  spot: SpotData;
  x: number;
  y: number;
}

const statusLabel: Record<string, string> = {
  IN_STOCK: "在庫",
  LEASED: "リース中",
  MAINTENANCE: "整備中",
  RETIRED: "廃車",
};

export function SpotTooltip({ spot, x, y }: SpotTooltipProps) {
  return (
    <div
      className="absolute z-50 bg-popover text-popover-foreground shadow-md rounded-lg border px-3 py-2 text-sm pointer-events-none"
      style={{
        left: x + 12,
        top: y - 8,
        maxWidth: 220,
      }}
    >
      <p className="font-medium">{spot.spotNumber}</p>
      {spot.vehicle ? (
        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{spot.vehicle.vehicleCode}</p>
          {spot.vehicle.plateNumber && <p>{spot.vehicle.plateNumber}</p>}
          <p>{spot.vehicle.maker} {spot.vehicle.modelName}</p>
          <p>{statusLabel[spot.vehicle.status] ?? spot.vehicle.status}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">空き</p>
      )}
    </div>
  );
}
