"use client";

import { Plus, Trash2, Grid3x3, Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AnnotationType, EditorMode } from "./spot-editor-types";

interface SpotEditorToolbarProps {
  spotCount: number;
  hasSelection: boolean;
  snapToGrid: boolean;
  onAddSpot: () => void;
  onDeleteSelected: () => void;
  onToggleSnap: () => void;
  onAddAnnotation: (type: AnnotationType) => void;
  editorMode: EditorMode;
  onSetEditorMode: (mode: EditorMode) => void;
}

const annotationMenuItems: Array<{ type: AnnotationType; label: string }> = [
  { type: "boundary", label: "外形" },
  { type: "road", label: "道路" },
  { type: "building", label: "建物" },
  { type: "entrance", label: "入口" },
  { type: "exit", label: "出口" },
  { type: "label", label: "ラベル" },
  { type: "line", label: "区切り線" },
];

export function SpotEditorToolbar({
  spotCount,
  hasSelection,
  snapToGrid,
  onAddSpot,
  onDeleteSelected,
  onToggleSnap,
  onAddAnnotation,
  editorMode,
  onSetEditorMode,
}: SpotEditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 py-2">
      {/* モード切り替えタブ */}
      <Tabs value={editorMode} onValueChange={(v) => onSetEditorMode(v as EditorMode)}>
        <TabsList>
          <TabsTrigger value="spots">スポット編集</TabsTrigger>
          <TabsTrigger value="annotations">形状編集</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* スポットモード時のみ表示 */}
      {editorMode === "spots" && (
        <Button variant="outline" size="sm" onClick={onAddSpot}>
          <Plus className="mr-1.5 h-4 w-4" />
          スポット追加
        </Button>
      )}

      {/* 形状モード時のみ表示 */}
      {editorMode === "annotations" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Shapes className="mr-1.5 h-4 w-4" />
              形状追加
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {annotationMenuItems.map((item) => (
              <DropdownMenuItem
                key={item.type}
                onClick={() => onAddAnnotation(item.type)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onDeleteSelected}
        disabled={!hasSelection}
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        削除
      </Button>
      <Button
        variant={snapToGrid ? "default" : "outline"}
        size="sm"
        onClick={onToggleSnap}
      >
        <Grid3x3 className="mr-1.5 h-4 w-4" />
        グリッド
      </Button>
      <Badge variant="secondary" className="ml-auto">
        {spotCount} 区画
      </Badge>
    </div>
  );
}
