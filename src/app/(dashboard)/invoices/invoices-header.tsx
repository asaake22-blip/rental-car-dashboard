"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceFormDialog } from "./invoice-form-dialog";

const statusTabs = [
  { value: "all", label: "全て" },
  { value: "DRAFT", label: "下書き" },
  { value: "ISSUED", label: "発行済" },
  { value: "PAID", label: "入金済" },
  { value: "OVERDUE", label: "延滞" },
  { value: "CANCELLED", label: "取消" },
] as const;

interface InvoicesHeaderProps {
  currentStatus: string | null;
  accounts?: { id: string; accountName: string }[];
  settledReservations: { id: string; reservationCode: string; customerName: string }[];
}

/**
 * 請求書一覧ヘッダー（ステータスタブ + 新規作成ボタン）
 */
export function InvoicesHeader({
  currentStatus,
  accounts,
  settledReservations,
}: InvoicesHeaderProps) {
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
    router.push(`/invoices?${params.toString()}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">請求書管理</h2>
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

      <InvoiceFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        accounts={accounts}
        settledReservations={settledReservations}
      />
    </>
  );
}
