"use client";

import { useState, useCallback } from "react";
import { SpotTooltip } from "./spot-tooltip";
import { AnnotationRenderer } from "./annotation-renderer";
import type { Annotation } from "./spot-editor-types";

export interface SpotData {
  id: string;
  spotNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  vehicle: {
    id: string;
    vehicleCode: string;
    plateNumber: string | null;
    maker: string;
    modelName: string;
    status: string;
  } | null;
}

interface ParkingMapProps {
  spots: SpotData[];
  canvasWidth: number;
  canvasHeight: number;
  onSpotClick?: (spot: SpotData) => void;
  annotations?: Annotation[];
}

/** 車両の状態に応じた枠の色 */
function getSpotColor(spot: SpotData): string {
  if (!spot.vehicle) return "#d1d5db"; // 空き: gray-300
  if (spot.vehicle.status === "MAINTENANCE") return "#fbbf24"; // 整備中: yellow-400
  if (spot.vehicle.status === "RENTED") return "#22c55e"; // 貸出中: green-500
  return "#3b82f6"; // 車両あり: blue-500
}

function getSpotFillColor(spot: SpotData): string {
  if (!spot.vehicle) return "#f9fafb"; // 空き: gray-50
  if (spot.vehicle.status === "MAINTENANCE") return "#fef9c3"; // 整備中: yellow-100
  if (spot.vehicle.status === "RENTED") return "#dcfce7"; // 貸出中: green-100
  return "#dbeafe"; // 車両あり: blue-100
}

export function ParkingMap({ spots, canvasWidth, canvasHeight, onSpotClick, annotations = [] }: ParkingMapProps) {
  const [hoveredSpot, setHoveredSpot] = useState<SpotData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = useCallback((spot: SpotData, e: React.MouseEvent<SVGGElement>) => {
    setHoveredSpot(spot);
    const rect = e.currentTarget.closest("svg")?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredSpot(null);
  }, []);

  return (
    <div className="relative border rounded-lg bg-white overflow-auto">
      <svg
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="block"
      >
        {/* グリッド背景 */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={canvasWidth} height={canvasHeight} fill="url(#grid)" />

        {/* アノテーション（スポットの下に描画） */}
        {annotations.length > 0 && (
          <AnnotationRenderer annotations={annotations} />
        )}

        {spots.map((spot) => (
          <g
            key={spot.id}
            transform={`translate(${spot.x + spot.width / 2}, ${spot.y + spot.height / 2}) rotate(${spot.rotation}) translate(${-spot.width / 2}, ${-spot.height / 2})`}
            onMouseEnter={(e) => handleMouseEnter(spot, e)}
            onMouseLeave={handleMouseLeave}
            onClick={() => onSpotClick?.(spot)}
            className="cursor-pointer"
          >
            <rect
              width={spot.width}
              height={spot.height}
              rx={4}
              fill={getSpotFillColor(spot)}
              stroke={getSpotColor(spot)}
              strokeWidth={2}
            />
            <text
              x={spot.width / 2}
              y={spot.height / 2 - 6}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-medium fill-gray-700 select-none pointer-events-none"
            >
              {spot.spotNumber}
            </text>
            {spot.vehicle && (
              <text
                x={spot.width / 2}
                y={spot.height / 2 + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[8px] fill-gray-500 select-none pointer-events-none"
              >
                {spot.vehicle.vehicleCode}
              </text>
            )}
          </g>
        ))}
      </svg>

      {hoveredSpot && (
        <SpotTooltip spot={hoveredSpot} x={tooltipPos.x} y={tooltipPos.y} />
      )}
    </div>
  );
}
