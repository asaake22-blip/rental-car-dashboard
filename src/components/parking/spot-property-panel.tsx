"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { EditableSpot } from "./spot-editor-types";

interface SpotPropertyPanelProps {
  spot: EditableSpot | null;
  allSpots: EditableSpot[];
  onUpdate: (id: string, changes: Partial<EditableSpot>) => void;
  onDelete: (id: string) => void;
}

export function SpotPropertyPanel({
  spot,
  allSpots,
  onUpdate,
  onDelete,
}: SpotPropertyPanelProps) {
  if (!spot) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4">
        スポットを選択するか
        <br />
        ダブルクリックで追加
      </div>
    );
  }

  // スポット番号の重複チェック
  const isDuplicate = allSpots.some(
    (s) => s.id !== spot.id && s.spotNumber === spot.spotNumber,
  );

  const handleChange = (field: keyof EditableSpot, value: string) => {
    if (field === "spotNumber") {
      onUpdate(spot.id, { spotNumber: value });
      return;
    }
    const numVal = parseFloat(value);
    if (!isNaN(numVal)) {
      onUpdate(spot.id, { [field]: numVal });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-sm">スポット設定</h3>

      <div className="space-y-3">
        {/* スポット番号 */}
        <div className="space-y-1">
          <Label htmlFor="spotNumber" className="text-xs">
            スポット番号
          </Label>
          <Input
            id="spotNumber"
            value={spot.spotNumber}
            onChange={(e) => handleChange("spotNumber", e.target.value)}
            className={isDuplicate ? "border-destructive" : ""}
          />
          {isDuplicate && (
            <p className="text-xs text-destructive">番号が重複しています</p>
          )}
        </div>

        {/* 座標 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="spotX" className="text-xs">
              X
            </Label>
            <Input
              id="spotX"
              type="number"
              value={Math.round(spot.x)}
              onChange={(e) => handleChange("x", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="spotY" className="text-xs">
              Y
            </Label>
            <Input
              id="spotY"
              type="number"
              value={Math.round(spot.y)}
              onChange={(e) => handleChange("y", e.target.value)}
            />
          </div>
        </div>

        {/* サイズ */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="spotW" className="text-xs">
              幅
            </Label>
            <Input
              id="spotW"
              type="number"
              min={20}
              value={Math.round(spot.width)}
              onChange={(e) => handleChange("width", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="spotH" className="text-xs">
              高さ
            </Label>
            <Input
              id="spotH"
              type="number"
              min={20}
              value={Math.round(spot.height)}
              onChange={(e) => handleChange("height", e.target.value)}
            />
          </div>
        </div>

        {/* 回転 */}
        <div className="space-y-1">
          <Label htmlFor="spotRotation" className="text-xs">
            回転 (度)
          </Label>
          <Input
            id="spotRotation"
            type="number"
            min={0}
            max={359}
            value={Math.round(spot.rotation)}
            onChange={(e) => handleChange("rotation", e.target.value)}
          />
        </div>
      </div>

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => onDelete(spot.id)}
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        このスポットを削除
      </Button>
    </div>
  );
}
