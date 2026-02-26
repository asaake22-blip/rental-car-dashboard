"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReservationFormDialog } from "./reservation-form-dialog";

const statusTabs = [
  { value: "all", label: "全て" },
  { value: "RESERVED", label: "予約" },
  { value: "CONFIRMED", label: "配車済" },
  { value: "DEPARTED", label: "出発中" },
  { value: "RETURNED", label: "帰着" },
  { value: "SETTLED", label: "精算済" },
  { value: "CANCELLED", label: "キャンセル" },
] as const;

interface ReservationsHeaderProps {
  currentStatus: string | null;
  vehicleClasses: { id: string; className: string }[];
  offices: { id: string; officeName: string }[];
}

/**
 * 予約一覧ヘッダー（ステータスタブ + 新規予約ボタン）
 */
export function ReservationsHeader({
  currentStatus,
  vehicleClasses,
  offices,
}: ReservationsHeaderProps) {
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    // ステータス切り替え時はページをリセット
    params.delete("page");
    router.push(`/reservations?${params.toString()}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">予約管理</h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規予約
        </Button>
      </div>

      <Tabs value={currentStatus ?? "all"} onValueChange={handleTabChange}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ReservationFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        vehicleClasses={vehicleClasses}
        offices={offices}
      />
    </>
  );
}
