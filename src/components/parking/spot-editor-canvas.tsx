"use client";

import { useRef, useCallback } from "react";
import type {
  EditableSpot,
  Annotation,
  EditorMode,
  DragState,
  ResizeDirection,
} from "./spot-editor-types";
import { AnnotationRenderer } from "./annotation-renderer";

interface SpotEditorCanvasProps {
  spots: EditableSpot[];
  canvasWidth: number;
  canvasHeight: number;
  selectedSpotId: string | null;
  snapToGrid: boolean;
  onSelectSpot: (id: string | null) => void;
  onUpdateSpot: (id: string, changes: Partial<EditableSpot>) => void;
  onAddSpot: () => void;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (id: string, changes: Partial<Annotation>) => void;
  editorMode: EditorMode;
}

/** グリッドスナップ */
const GRID_SIZE = 10;
function snap(value: number, enabled: boolean): number {
  return enabled ? Math.round(value / GRID_SIZE) * GRID_SIZE : value;
}

/** リサイズハンドルのサイズ */
const HANDLE_SIZE = 8;
/** 回転ハンドルのオフセット（上辺中央からの距離） */
const ROTATE_HANDLE_OFFSET = 24;
const ROTATE_HANDLE_RADIUS = 6;
/** スポットの最小サイズ */
const MIN_SIZE = 20;

/** クライアント座標を SVG ユーザー座標に変換 */
function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

/** スポットの色（編集モード用） */
function getSpotFill(spotId: string, selectedId: string | null): string {
  return spotId === selectedId ? "#dbeafe" : "#f3f4f6";
}
function getSpotStroke(spotId: string, selectedId: string | null): string {
  return spotId === selectedId ? "#2563eb" : "#9ca3af";
}

export function SpotEditorCanvas({
  spots,
  canvasWidth,
  canvasHeight,
  selectedSpotId,
  snapToGrid,
  onSelectSpot,
  onUpdateSpot,
  onAddSpot,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onUpdateAnnotation,
  editorMode,
}: SpotEditorCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  /** ドラッグ直後の click 発火を抑制するフラグ */
  const justDraggedRef = useRef(false);

  /** ドラッグ中の要素座標を直接 SVG 属性で更新（パフォーマンス対策） */
  const applyDragVisual = useCallback(
    (targetId: string, targetType: "spot" | "annotation", changes: Partial<EditableSpot>) => {
      const svg = svgRef.current;
      if (!svg) return;

      const selector = targetType === "spot"
        ? `[data-spot-id="${targetId}"]`
        : `[data-annotation-id="${targetId}"]`;
      const group = svg.querySelector(selector);
      if (!group) return;

      const drag = dragRef.current;
      if (!drag) return;

      const s = { ...drag.startSpot, ...changes };
      group.setAttribute(
        "transform",
        `translate(${s.x + s.width / 2}, ${s.y + s.height / 2}) rotate(${s.rotation}) translate(${-s.width / 2}, ${-s.height / 2})`,
      );

      const rectSelector = targetType === "spot" ? "rect.spot-rect" : "rect.annotation-rect";
      const rect = group.querySelector(rectSelector);
      if (rect) {
        rect.setAttribute("width", String(s.width));
        rect.setAttribute("height", String(s.height));
      }
    },
    [],
  );

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent,
      targetId: string,
      targetType: "spot" | "annotation",
      mode: DragState["mode"],
      resizeDir?: ResizeDirection,
    ) => {
      e.stopPropagation();
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;

      const pt = clientToSvg(svg, e.clientX, e.clientY);

      let startSpot: EditableSpot;
      if (targetType === "spot") {
        const spot = spots.find((s) => s.id === targetId);
        if (!spot) return;
        onSelectSpot(targetId);
        // SELECT_SPOT が排他選択を処理（selectedAnnotationId = null）
        startSpot = { ...spot };
      } else {
        const ann = annotations.find((a) => a.id === targetId);
        if (!ann) return;
        onSelectAnnotation(targetId);
        // SELECT_ANNOTATION が排他選択を処理（selectedSpotId = null）
        // Annotation を EditableSpot 互換にマッピング
        startSpot = {
          id: ann.id,
          spotNumber: "",
          x: ann.x,
          y: ann.y,
          width: ann.width,
          height: ann.height,
          rotation: ann.rotation,
        };
      }

      dragRef.current = {
        mode,
        targetId,
        targetType,
        startMouse: pt,
        startSpot,
        resizeDir,
      };
    },
    [spots, annotations, onSelectSpot, onSelectAnnotation],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;

      const svg = svgRef.current;
      if (!svg) return;

      const pt = clientToSvg(svg, e.clientX, e.clientY);
      const dx = pt.x - drag.startMouse.x;
      const dy = pt.y - drag.startMouse.y;
      const s = drag.startSpot;

      if (drag.mode === "move") {
        let newX = snap(s.x + dx, snapToGrid);
        let newY = snap(s.y + dy, snapToGrid);
        // キャンバス外はみ出し防止
        newX = Math.max(0, Math.min(canvasWidth - s.width, newX));
        newY = Math.max(0, Math.min(canvasHeight - s.height, newY));
        applyDragVisual(drag.targetId, drag.targetType, { x: newX, y: newY });
      }

      if (drag.mode === "resize" && drag.resizeDir) {
        const dir = drag.resizeDir;
        let newX = s.x;
        let newY = s.y;
        let newW = s.width;
        let newH = s.height;

        if (dir.includes("e")) {
          newW = snap(Math.max(MIN_SIZE, s.width + dx), snapToGrid);
        }
        if (dir.includes("w")) {
          const dxSnapped = snap(dx, snapToGrid);
          newW = Math.max(MIN_SIZE, s.width - dxSnapped);
          newX = s.x + (s.width - newW);
        }
        if (dir.includes("s")) {
          newH = snap(Math.max(MIN_SIZE, s.height + dy), snapToGrid);
        }
        if (dir.includes("n")) {
          const dySnapped = snap(dy, snapToGrid);
          newH = Math.max(MIN_SIZE, s.height - dySnapped);
          newY = s.y + (s.height - newH);
        }

        // キャンバス外はみ出し防止
        if (newX < 0) {
          newW += newX;
          newX = 0;
        }
        if (newY < 0) {
          newH += newY;
          newY = 0;
        }
        newW = Math.min(newW, canvasWidth - newX);
        newH = Math.min(newH, canvasHeight - newY);

        applyDragVisual(drag.targetId, drag.targetType, {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        });
      }

      if (drag.mode === "rotate") {
        const cx = s.x + s.width / 2;
        const cy = s.y + s.height / 2;
        const angle =
          Math.atan2(pt.y - cy, pt.x - cx) * (180 / Math.PI) + 90;
        const normalizedAngle = ((angle % 360) + 360) % 360;
        // Shift キーで 15 度スナップ
        const snappedAngle = e.shiftKey
          ? Math.round(normalizedAngle / 15) * 15
          : Math.round(normalizedAngle);
        applyDragVisual(drag.targetId, drag.targetType, { rotation: snappedAngle });
      }
    },
    [snapToGrid, canvasWidth, canvasHeight, applyDragVisual],
  );

  const handleMouseUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;

    const svg = svgRef.current;
    if (!svg) return;

    // 最終座標を取得して reducer に反映
    const selector = drag.targetType === "spot"
      ? `[data-spot-id="${drag.targetId}"]`
      : `[data-annotation-id="${drag.targetId}"]`;
    const group = svg.querySelector(selector);
    if (group) {
      const transform = group.getAttribute("transform") ?? "";
      const rectSelector = drag.targetType === "spot" ? "rect.spot-rect" : "rect.annotation-rect";
      const rect = group.querySelector(rectSelector);
      const w = rect ? parseFloat(rect.getAttribute("width") ?? "0") : drag.startSpot.width;
      const h = rect ? parseFloat(rect.getAttribute("height") ?? "0") : drag.startSpot.height;

      // transform から translate と rotate を解析
      const translateMatch = transform.match(
        /translate\(([-\d.]+),\s*([-\d.]+)\)/,
      );
      const rotateMatch = transform.match(/rotate\(([-\d.]+)\)/);

      if (translateMatch) {
        const tx = parseFloat(translateMatch[1]);
        const ty = parseFloat(translateMatch[2]);
        const rotation = rotateMatch
          ? parseFloat(rotateMatch[1])
          : drag.startSpot.rotation;

        // transform は translate(cx, cy) rotate(r) translate(-w/2, -h/2)
        // なので cx = tx, cy = ty, x = cx - w/2, y = cy - h/2
        let x = tx - w / 2;
        let y = ty - h / 2;

        // キャンバス境界にクランプ
        x = Math.max(0, Math.min(canvasWidth - w, x));
        y = Math.max(0, Math.min(canvasHeight - h, y));

        const changes = {
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          width: Math.round(w * 10) / 10,
          height: Math.round(h * 10) / 10,
          rotation: Math.round(rotation * 10) / 10,
        };

        if (drag.targetType === "spot") {
          onUpdateSpot(drag.targetId, changes);
        } else {
          onUpdateAnnotation(drag.targetId, changes);
        }
      }
    }

    dragRef.current = null;

    // ドラッグ終了直後の click イベント発火を抑制
    justDraggedRef.current = true;
    requestAnimationFrame(() => {
      justDraggedRef.current = false;
    });
  }, [onUpdateSpot, onUpdateAnnotation, canvasWidth, canvasHeight]);

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // ドラッグ直後の click は無視
      if (justDraggedRef.current) return;
      // 演算子優先順位バグ修正: && を括弧で囲む
      if (e.target === svgRef.current || ((e.target as Element).tagName === "rect" && (e.target as Element).id === "bg-grid")) {
        onSelectSpot(null);
        onSelectAnnotation(null);
      }
    },
    [onSelectSpot, onSelectAnnotation],
  );

  const handleSvgDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // スポットモード時のみ、空白部分のダブルクリックで新規スポット追加
      if (editorMode === "spots" && (e.target === svgRef.current || (e.target as Element).id === "bg-grid")) {
        onAddSpot();
      }
    },
    [onAddSpot, editorMode],
  );

  const handleAnnotationClick = useCallback(
    (id: string) => {
      onSelectAnnotation(id);
      // SELECT_ANNOTATION が排他選択を処理（selectedSpotId = null）
    },
    [onSelectAnnotation],
  );

  const handleAnnotationMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      handleMouseDown(e, id, "annotation", "move");
    },
    [handleMouseDown],
  );

  const selectedSpot = spots.find((s) => s.id === selectedSpotId);
  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId);

  return (
    <div className="relative border rounded-lg bg-white overflow-auto" style={{ contain: 'inline-size' }}>
      <svg
        ref={svgRef}
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="block select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleSvgClick}
        onDoubleClick={handleSvgDoubleClick}
      >
        {/* グリッド背景 */}
        <defs>
          <pattern
            id="editor-grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect
          id="bg-grid"
          width={canvasWidth}
          height={canvasHeight}
          fill="url(#editor-grid)"
        />

        {/* アノテーション層（スポットの下に描画） */}
        <g style={{
          pointerEvents: editorMode === "annotations" ? "auto" : "none",
          opacity: editorMode === "annotations" ? 1 : 0.5,
        }}>
          <AnnotationRenderer
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationMouseDown={handleAnnotationMouseDown}
            interactive
          />
        </g>

        {/* スポット層 */}
        <g style={{
          pointerEvents: editorMode === "spots" ? "auto" : "none",
          opacity: editorMode === "spots" ? 1 : 0.3,
        }}>
          {spots.map((spot) => {
            const isSelected = spot.id === selectedSpotId;
            return (
              <g
                key={spot.id}
                data-spot-id={spot.id}
                transform={`translate(${spot.x + spot.width / 2}, ${spot.y + spot.height / 2}) rotate(${spot.rotation}) translate(${-spot.width / 2}, ${-spot.height / 2})`}
                className="cursor-move"
                onMouseDown={(e) => handleMouseDown(e, spot.id, "spot", "move")}
              >
                {/* スポット矩形 */}
                <rect
                  className="spot-rect"
                  width={spot.width}
                  height={spot.height}
                  rx={4}
                  fill={getSpotFill(spot.id, selectedSpotId)}
                  stroke={getSpotStroke(spot.id, selectedSpotId)}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {/* スポット番号 */}
                <text
                  x={spot.width / 2}
                  y={spot.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[11px] font-medium fill-gray-700 select-none pointer-events-none"
                >
                  {spot.spotNumber}
                </text>
              </g>
            );
          })}
        </g>

        {/* 選択中スポットのハンドル群（スポットモード時のみ表示） */}
        {selectedSpot && editorMode === "spots" && (
          <g
            transform={`translate(${selectedSpot.x + selectedSpot.width / 2}, ${selectedSpot.y + selectedSpot.height / 2}) rotate(${selectedSpot.rotation}) translate(${-selectedSpot.width / 2}, ${-selectedSpot.height / 2})`}
            className="pointer-events-auto"
          >
            {/* リサイズハンドル（四隅） */}
            {(
              [
                { dir: "nw" as const, cx: 0, cy: 0, cursor: "nwse-resize" },
                {
                  dir: "ne" as const,
                  cx: selectedSpot.width,
                  cy: 0,
                  cursor: "nesw-resize",
                },
                {
                  dir: "sw" as const,
                  cx: 0,
                  cy: selectedSpot.height,
                  cursor: "nesw-resize",
                },
                {
                  dir: "se" as const,
                  cx: selectedSpot.width,
                  cy: selectedSpot.height,
                  cursor: "nwse-resize",
                },
              ] as const
            ).map(({ dir, cx, cy, cursor }) => (
              <rect
                key={dir}
                x={cx - HANDLE_SIZE / 2}
                y={cy - HANDLE_SIZE / 2}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                rx={2}
                fill="white"
                stroke="#2563eb"
                strokeWidth={1.5}
                style={{ cursor }}
                onMouseDown={(e) =>
                  handleMouseDown(e, selectedSpot.id, "spot", "resize", dir)
                }
              />
            ))}

            {/* 回転ハンドル（上辺中央の上方） */}
            <line
              x1={selectedSpot.width / 2}
              y1={0}
              x2={selectedSpot.width / 2}
              y2={-ROTATE_HANDLE_OFFSET + ROTATE_HANDLE_RADIUS}
              stroke="#2563eb"
              strokeWidth={1}
              strokeDasharray="3,2"
              className="pointer-events-none"
            />
            <circle
              cx={selectedSpot.width / 2}
              cy={-ROTATE_HANDLE_OFFSET}
              r={ROTATE_HANDLE_RADIUS}
              fill="white"
              stroke="#2563eb"
              strokeWidth={1.5}
              className="cursor-grab"
              onMouseDown={(e) =>
                handleMouseDown(e, selectedSpot.id, "spot", "rotate")
              }
            />
          </g>
        )}

        {/* 選択中アノテーションのハンドル群（形状モード時のみ表示） */}
        {selectedAnnotation && editorMode === "annotations" && selectedAnnotation.type !== "label" && (
          <g
            transform={`translate(${selectedAnnotation.x + selectedAnnotation.width / 2}, ${selectedAnnotation.y + selectedAnnotation.height / 2}) rotate(${selectedAnnotation.rotation}) translate(${-selectedAnnotation.width / 2}, ${-selectedAnnotation.height / 2})`}
            className="pointer-events-auto"
          >
            {/* リサイズハンドル（四隅） */}
            {(
              [
                { dir: "nw" as const, cx: 0, cy: 0, cursor: "nwse-resize" },
                {
                  dir: "ne" as const,
                  cx: selectedAnnotation.width,
                  cy: 0,
                  cursor: "nesw-resize",
                },
                {
                  dir: "sw" as const,
                  cx: 0,
                  cy: selectedAnnotation.height,
                  cursor: "nesw-resize",
                },
                {
                  dir: "se" as const,
                  cx: selectedAnnotation.width,
                  cy: selectedAnnotation.height,
                  cursor: "nwse-resize",
                },
              ] as const
            ).map(({ dir, cx, cy, cursor }) => (
              <rect
                key={dir}
                x={cx - HANDLE_SIZE / 2}
                y={cy - HANDLE_SIZE / 2}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                rx={2}
                fill="white"
                stroke="#2563eb"
                strokeWidth={1.5}
                style={{ cursor }}
                onMouseDown={(e) =>
                  handleMouseDown(e, selectedAnnotation.id, "annotation", "resize", dir)
                }
              />
            ))}

            {/* 回転ハンドル */}
            <line
              x1={selectedAnnotation.width / 2}
              y1={0}
              x2={selectedAnnotation.width / 2}
              y2={-ROTATE_HANDLE_OFFSET + ROTATE_HANDLE_RADIUS}
              stroke="#2563eb"
              strokeWidth={1}
              strokeDasharray="3,2"
              className="pointer-events-none"
            />
            <circle
              cx={selectedAnnotation.width / 2}
              cy={-ROTATE_HANDLE_OFFSET}
              r={ROTATE_HANDLE_RADIUS}
              fill="white"
              stroke="#2563eb"
              strokeWidth={1.5}
              className="cursor-grab"
              onMouseDown={(e) =>
                handleMouseDown(e, selectedAnnotation.id, "annotation", "rotate")
              }
            />
          </g>
        )}

        {/* ラベル型アノテーションのドラッグハンドル（形状モード時のみ表示） */}
        {selectedAnnotation && editorMode === "annotations" && selectedAnnotation.type === "label" && (
          <g
            transform={`translate(${selectedAnnotation.x}, ${selectedAnnotation.y})`}
            className="pointer-events-auto cursor-move"
            onMouseDown={(e) =>
              handleMouseDown(e, selectedAnnotation.id, "annotation", "move")
            }
          >
            <rect
              x={-6}
              y={-(selectedAnnotation.fontSize ?? 14) * 0.8 - 2}
              width={12}
              height={12}
              rx={2}
              fill="white"
              stroke="#2563eb"
              strokeWidth={1.5}
              className="cursor-move"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
