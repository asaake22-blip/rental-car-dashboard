"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Annotation, AnnotationType, StrokeDash, Direction } from "./spot-editor-types";

interface AnnotationPropertyPanelProps {
  annotation: Annotation | null;
  onUpdate: (id: string, changes: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
}

const typeLabels: Record<AnnotationType, string> = {
  boundary: "外形",
  road: "道路",
  building: "建物",
  entrance: "入口",
  exit: "出口",
  label: "ラベル",
  line: "区切り線",
};

const strokeDashLabels: Record<StrokeDash, string> = {
  solid: "実線",
  dashed: "破線",
  dotted: "点線",
};

const directionLabels: Record<Direction, string> = {
  north: "北（上）",
  south: "南（下）",
  east: "東（右）",
  west: "西（左）",
};

export function AnnotationPropertyPanel({
  annotation,
  onUpdate,
  onDelete,
}: AnnotationPropertyPanelProps) {
  if (!annotation) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4">
        アノテーションを選択してください
      </div>
    );
  }

  const handleStringChange = (field: keyof Annotation, value: string) => {
    onUpdate(annotation.id, { [field]: value });
  };

  const handleNumberChange = (field: keyof Annotation, value: string) => {
    const numVal = parseFloat(value);
    if (!isNaN(numVal)) {
      onUpdate(annotation.id, { [field]: numVal });
    }
  };

  const isEntranceOrExit = annotation.type === "entrance" || annotation.type === "exit";
  const isLabel = annotation.type === "label";
  const isLine = annotation.type === "line";
  const showSize = !isLabel;

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-sm">アノテーション設定</h3>

      <div className="space-y-3">
        {/* 種別表示 */}
        <div className="space-y-1">
          <Label className="text-xs">種別</Label>
          <div className="text-sm font-medium px-3 py-1.5 bg-muted rounded-md">
            {typeLabels[annotation.type]}
          </div>
        </div>

        {/* ラベルテキスト */}
        <div className="space-y-1">
          <Label htmlFor="annLabel" className="text-xs">
            ラベル
          </Label>
          <Input
            id="annLabel"
            value={annotation.label ?? ""}
            onChange={(e) => handleStringChange("label", e.target.value)}
          />
        </div>

        {/* 座標 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="annX" className="text-xs">
              X
            </Label>
            <Input
              id="annX"
              type="number"
              value={Math.round(annotation.x)}
              onChange={(e) => handleNumberChange("x", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="annY" className="text-xs">
              Y
            </Label>
            <Input
              id="annY"
              type="number"
              value={Math.round(annotation.y)}
              onChange={(e) => handleNumberChange("y", e.target.value)}
            />
          </div>
        </div>

        {/* サイズ（label/line 以外） */}
        {showSize && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="annW" className="text-xs">
                幅
              </Label>
              <Input
                id="annW"
                type="number"
                min={isLine ? 1 : 20}
                value={Math.round(annotation.width)}
                onChange={(e) => handleNumberChange("width", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="annH" className="text-xs">
                高さ
              </Label>
              <Input
                id="annH"
                type="number"
                min={isLine ? 1 : 20}
                value={Math.round(annotation.height)}
                onChange={(e) => handleNumberChange("height", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* 回転角度 */}
        <div className="space-y-1">
          <Label htmlFor="annRotation" className="text-xs">
            回転 (度)
          </Label>
          <Input
            id="annRotation"
            type="number"
            min={0}
            max={359}
            value={Math.round(annotation.rotation)}
            onChange={(e) => handleNumberChange("rotation", e.target.value)}
          />
        </div>

        {/* 線色 */}
        <div className="space-y-1">
          <Label htmlFor="annStrokeColor" className="text-xs">
            線色
          </Label>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border shrink-0"
              style={{ backgroundColor: annotation.strokeColor }}
            />
            <Input
              id="annStrokeColor"
              value={annotation.strokeColor}
              onChange={(e) => handleStringChange("strokeColor", e.target.value)}
            />
          </div>
        </div>

        {/* 塗り色 */}
        <div className="space-y-1">
          <Label htmlFor="annFillColor" className="text-xs">
            塗り色
          </Label>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border shrink-0"
              style={{ backgroundColor: annotation.fillColor }}
            />
            <Input
              id="annFillColor"
              value={annotation.fillColor}
              onChange={(e) => handleStringChange("fillColor", e.target.value)}
            />
          </div>
        </div>

        {/* 線幅 */}
        <div className="space-y-1">
          <Label htmlFor="annStrokeWidth" className="text-xs">
            線幅
          </Label>
          <Input
            id="annStrokeWidth"
            type="number"
            min={0}
            max={10}
            value={annotation.strokeWidth}
            onChange={(e) => handleNumberChange("strokeWidth", e.target.value)}
          />
        </div>

        {/* 線種 */}
        <div className="space-y-1">
          <Label className="text-xs">線種</Label>
          <Select
            value={annotation.strokeDash}
            onValueChange={(value) =>
              onUpdate(annotation.id, { strokeDash: value as StrokeDash })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(strokeDashLabels) as [StrokeDash, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        {/* 方向（entrance/exit のみ） */}
        {isEntranceOrExit && (
          <div className="space-y-1">
            <Label className="text-xs">方向</Label>
            <Select
              value={annotation.direction ?? "north"}
              onValueChange={(value) =>
                onUpdate(annotation.id, { direction: value as Direction })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(directionLabels) as [Direction, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* フォントサイズ（label のみ） */}
        {isLabel && (
          <div className="space-y-1">
            <Label htmlFor="annFontSize" className="text-xs">
              フォントサイズ
            </Label>
            <Input
              id="annFontSize"
              type="number"
              min={8}
              max={48}
              value={annotation.fontSize ?? 14}
              onChange={(e) => handleNumberChange("fontSize", e.target.value)}
            />
          </div>
        )}
      </div>

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => onDelete(annotation.id)}
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        このアノテーションを削除
      </Button>
    </div>
  );
}
