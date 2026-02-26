/**
 * ガントチャートデータフェッチ hook
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { GanttData } from "./gantt-types";

interface UseGanttDataParams {
  startDate: Date;
  endDate: Date;
  officeId?: string;
  vehicleClassId?: string;
}

export function useGanttData({ startDate, endDate, officeId, vehicleClassId }: UseGanttDataParams) {
  const [data, setData] = useState<GanttData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });
    if (officeId) params.set("officeId", officeId);
    if (vehicleClassId) params.set("vehicleClassId", vehicleClassId);

    try {
      const url = `/api/dispatch?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        setError(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "データの取得に失敗しました");
      }
    } catch (e) {
      setError(`fetch失敗: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, officeId, vehicleClassId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
