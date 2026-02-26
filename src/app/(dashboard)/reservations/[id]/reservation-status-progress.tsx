"use client";

/**
 * 予約ステータスの進行バー
 *
 * 予約 -> 配車済 -> 出発 -> 帰着 -> 精算済 のステップを横並びで表示し、
 * 現在のステータスをハイライトする。
 * キャンセル・ノーショーの場合は別表示。
 */

import { Check } from "lucide-react";

const steps = [
  { key: "RESERVED", label: "予約" },
  { key: "CONFIRMED", label: "配車済" },
  { key: "DEPARTED", label: "出発" },
  { key: "RETURNED", label: "帰着" },
  { key: "SETTLED", label: "精算済" },
] as const;

const stepIndex: Record<string, number> = {
  RESERVED: 0,
  CONFIRMED: 1,
  DEPARTED: 2,
  RETURNED: 3,
  SETTLED: 4,
};

interface ReservationStatusProgressProps {
  status: string;
}

export function ReservationStatusProgress({ status }: ReservationStatusProgressProps) {
  // キャンセル・ノーショーは特別表示
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
        <span className="text-sm font-medium text-red-700 dark:text-red-300">
          この予約はキャンセルされました
        </span>
      </div>
    );
  }

  if (status === "NO_SHOW") {
    return (
      <div className="flex items-center justify-center rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
          ノーショー（来店なし）
        </span>
      </div>
    );
  }

  const currentIdx = stepIndex[status] ?? 0;

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors ${
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium ${
                  isCompleted || isCurrent
                    ? "text-foreground"
                    : "text-muted-foreground/50"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* コネクターライン（最後のステップ以外） */}
            {idx < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  idx < currentIdx
                    ? "bg-primary"
                    : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
