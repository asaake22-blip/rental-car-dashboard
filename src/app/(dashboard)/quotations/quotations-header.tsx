"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuotationFormDialog } from "./quotation-form-dialog";

const statusTabs = [
  { value: "all", label: "全て" },
  { value: "DRAFT", label: "下書き" },
  { value: "SENT", label: "送付済" },
  { value: "ACCEPTED", label: "承諾" },
  { value: "EXPIRED", label: "期限切" },
  { value: "REJECTED", label: "不成立" },
] as const;

interface QuotationsHeaderProps {
  currentStatus: string | null;
  accounts: { id: string; accountName: string }[];
  vehicleClasses: { id: string; className: string }[];
  offices: { id: string; officeName: string }[];
}

/**
 * 見積書一覧ヘッダー（ステータスタブ + 新規作成ボタン）
 */
export function QuotationsHeader({
  currentStatus,
  accounts,
  vehicleClasses,
  offices,
}: QuotationsHeaderProps) {
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
    params.delete("page");
    router.push(`/quotations?${params.toString()}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">見積書</h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
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

      <QuotationFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        accounts={accounts}
        vehicleClasses={vehicleClasses}
        offices={offices}
      />
    </>
  );
}
