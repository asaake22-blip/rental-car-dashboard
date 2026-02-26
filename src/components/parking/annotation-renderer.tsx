"use client";

import type { Annotation, StrokeDash, Direction } from "./spot-editor-types";

interface AnnotationRendererProps {
  annotations: Annotation[];
  selectedAnnotationId?: string | null;
  onAnnotationClick?: (id: string) => void;
  onAnnotationMouseDown?: (e: React.MouseEvent, id: string) => void;
  interactive?: boolean;
}

/** strokeDash を SVG の strokeDasharray に変換 */
function toDashArray(dash: StrokeDash): string | undefined {
  switch (dash) {
    case "dashed":
      return "8,4";
    case "dotted":
      return "2,4";
    default:
      return undefined;
  }
}

/** 方向に応じた矢印パスを生成（中心を基準に描画） */
function arrowPath(direction: Direction, width: number, height: number): string {
  const cx = width / 2;
  const cy = height / 2;
  const size = Math.min(width, height) * 0.3;

  // 基本の上向き矢印
  const points = `M ${cx} ${cy - size} L ${cx + size * 0.6} ${cy + size * 0.3} L ${cx} ${cy} L ${cx - size * 0.6} ${cy + size * 0.3} Z`;

  switch (direction) {
    case "north":
      return points;
    case "south": {
      // 下向き: 180度回転
      const s = size;
      return `M ${cx} ${cy + s} L ${cx + s * 0.6} ${cy - s * 0.3} L ${cx} ${cy} L ${cx - s * 0.6} ${cy - s * 0.3} Z`;
    }
    case "east": {
      // 右向き
      const s = size;
      return `M ${cx + s} ${cy} L ${cx - s * 0.3} ${cy - s * 0.6} L ${cx} ${cy} L ${cx - s * 0.3} ${cy + s * 0.6} Z`;
    }
    case "west": {
      // 左向き
      const s = size;
      return `M ${cx - s} ${cy} L ${cx + s * 0.3} ${cy - s * 0.6} L ${cx} ${cy} L ${cx + s * 0.3} ${cy + s * 0.6} Z`;
    }
  }
}

/** アノテーション1件を SVG 要素として描画 */
function renderAnnotation(
  ann: Annotation,
  isSelected: boolean,
  interactive: boolean,
  onAnnotationClick?: (id: string) => void,
  onAnnotationMouseDown?: (e: React.MouseEvent, id: string) => void,
) {
  const dashArray = toDashArray(ann.strokeDash);
  // handleMouseUp のパーサーと一致させるため、常に中心座標形式を使用
  const transform = `translate(${ann.x + ann.width / 2}, ${ann.y + ann.height / 2}) rotate(${ann.rotation}) translate(${-ann.width / 2}, ${-ann.height / 2})`;

  const handleClick = interactive && onAnnotationClick
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        onAnnotationClick(ann.id);
      }
    : undefined;

  const handleMouseDown = interactive && onAnnotationMouseDown
    ? (e: React.MouseEvent) => {
        onAnnotationMouseDown(e, ann.id);
      }
    : undefined;

  const cursorClass = interactive ? "cursor-move" : "";

  switch (ann.type) {
    case "boundary":
      return (
        <g
          key={ann.id}
          data-annotation-id={ann.id}
          transform={transform}
          className={cursorClass}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
        >
          <rect
            className="annotation-rect"
            width={ann.width}
            height={ann.height}
            fill={ann.fillColor}
            stroke={ann.strokeColor}
            strokeWidth={ann.strokeWidth}
            strokeDasharray={dashArray}
            rx={2}
          />
          {isSelected && (
            <rect
              width={ann.width}
              height={ann.height}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="6,3"
              rx={2}
              className="pointer-events-none"
            />
          )}
        </g>
      );

    case "road":
      return (
        <g
          key={ann.id}
          data-annotation-id={ann.id}
          transform={transform}
          className={cursorClass}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
        >
          <rect
            className="annotation-rect"
            width={ann.width}
            height={ann.height}
            fill={ann.fillColor}
            stroke={ann.strokeColor}
            strokeWidth={ann.strokeWidth}
            strokeDasharray={dashArray}
          />
          {ann.label && (
            <text
              x={ann.width / 2}
              y={ann.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[12px] fill-gray-500 select-none pointer-events-none"
            >
              {ann.label}
            </text>
          )}
          {isSelected && (
            <rect
              width={ann.width}
              height={ann.height}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="6,3"
              className="pointer-events-none"
            />
          )}
        </g>
      );

    case "building":
      return (
        <g
          key={ann.id}
          data-annotation-id={ann.id}
          transform={transform}
          className={cursorClass}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
        >
          <rect
            className="annotation-rect"
            width={ann.width}
            height={ann.height}
            fill={ann.fillColor}
            stroke={ann.strokeColor}
            strokeWidth={ann.strokeWidth}
            strokeDasharray={dashArray}
            rx={3}
          />
          {ann.label && (
            <text
              x={ann.width / 2}
              y={ann.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[11px] font-medium fill-orange-700 select-none pointer-events-none"
            >
              {ann.label}
            </text>
          )}
          {isSelected && (
            <rect
              width={ann.width}
              height={ann.height}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="6,3"
              rx={3}
              className="pointer-events-none"
            />
          )}
        </g>
      );

    case "entrance":
    case "exit": {
      const arrowColor = ann.type === "entrance" ? "#16a34a" : "#dc2626";
      const direction = ann.direction ?? "north";
      return (
        <g
          key={ann.id}
          data-annotation-id={ann.id}
          transform={transform}
          className={cursorClass}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
        >
          <rect
            className="annotation-rect"
            width={ann.width}
            height={ann.height}
            fill={ann.fillColor}
            stroke={ann.strokeColor}
            strokeWidth={ann.strokeWidth}
            strokeDasharray={dashArray}
            rx={2}
          />
          {/* 矢印 */}
          <path
            d={arrowPath(direction, ann.width, ann.height)}
            fill={arrowColor}
            opacity={0.8}
            className="pointer-events-none"
          />
          {ann.label && (
            <text
              x={ann.width / 2}
              y={ann.height + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-gray-600 select-none pointer-events-none"
            >
              {ann.label}
            </text>
          )}
          {isSelected && (
            <rect
              width={ann.width}
              height={ann.height}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="6,3"
              rx={2}
              className="pointer-events-none"
            />
          )}
        </g>
      );
    }

    case "label":
      return (
        <g
          key={ann.id}
          data-annotation-id={ann.id}
          transform={transform}
          className={cursorClass}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
        >
          {/* クリック用の透明な当たり判定領域 */}
          {interactive && (
            <rect
              x={-4}
              y={-(ann.fontSize ?? 14) * 0.8}
              width={Math.max((ann.label?.length ?? 0) * (ann.fontSize ?? 14) * 0.7, 30)}
              height={(ann.fontSize ?? 14) * 1.4}
              fill="transparent"
              className="pointer-events-auto"
            />
          )}
          <text
            x={0}
            y={0}
            textAnchor="start"
            dominantBaseline="middle"
            fontSize={ann.fontSize ?? 14}
            className="fill-gray-700 select-none"
            style={{ pointerEvents: interactive ? "none" : "auto" }}
          >
            {ann.label ?? ""}
          </text>
          {isSelected && (
            <rect
              x={-4}
              y={-(ann.fontSize ?? 14) * 0.8}
              width={Math.max((ann.label?.length ?? 0) * (ann.fontSize ?? 14) * 0.7, 30)}
              height={(ann.fontSize ?? 14) * 1.4}
              fill="none"
              stroke="#2563eb"
              strokeWidth={1.5}
              strokeDasharray="4,2"
              className="pointer-events-none"
            />
          )}
        </g>
      );

    case "line":
      return (
        <g
          key={ann.id}
          data-annotation-id={ann.id}
          transform={transform}
          className={cursorClass}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
        >
          <rect
            className="annotation-rect"
            width={ann.width}
            height={ann.height}
            fill={ann.strokeColor}
            stroke="none"
            strokeDasharray={dashArray}
          />
          {/* dashed/dotted の場合は線として描画 */}
          {ann.strokeDash !== "solid" && (
            <line
              x1={0}
              y1={ann.height / 2}
              x2={ann.width}
              y2={ann.height / 2}
              stroke={ann.strokeColor}
              strokeWidth={ann.strokeWidth}
              strokeDasharray={dashArray}
              className="pointer-events-none"
            />
          )}
          {/* クリック用の透明な当たり判定（線が細すぎるため） */}
          {interactive && (
            <rect
              y={-4}
              width={ann.width}
              height={ann.height + 8}
              fill="transparent"
              className="pointer-events-auto"
            />
          )}
          {isSelected && (
            <rect
              y={-2}
              width={ann.width}
              height={ann.height + 4}
              fill="none"
              stroke="#2563eb"
              strokeWidth={1.5}
              strokeDasharray="4,2"
              className="pointer-events-none"
            />
          )}
        </g>
      );

    default:
      return null;
  }
}

export function AnnotationRenderer({
  annotations,
  selectedAnnotationId,
  onAnnotationClick,
  onAnnotationMouseDown,
  interactive = false,
}: AnnotationRendererProps) {
  // zIndex 昇順でソートして描画
  const sorted = [...annotations].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <g data-layer="annotations">
      {sorted.map((ann) =>
        renderAnnotation(
          ann,
          ann.id === selectedAnnotationId,
          interactive,
          onAnnotationClick,
          onAnnotationMouseDown,
        ),
      )}
    </g>
  );
}
