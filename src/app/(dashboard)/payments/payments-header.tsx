"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentFormDialog } from "./payment-form-dialog";

interface PaymentsHeaderProps {
  status: string | null;
  category: string | null;
}

const statusOptions = [
  { value: "ALL", label: "全て" },
  { value: "UNALLOCATED", label: "未消込" },
  { value: "PARTIALLY_ALLOCATED", label: "一部消込" },
  { value: "FULLY_ALLOCATED", label: "全額消込" },
];

const categoryOptions = [
  { value: "ALL", label: "全カテゴリ" },
  { value: "BANK_TRANSFER", label: "銀行振込" },
  { value: "CASH", label: "現金" },
  { value: "CREDIT_CARD", label: "クレジットカード" },
  { value: "ELECTRONIC_MONEY", label: "電子マネー" },
  { value: "QR_PAYMENT", label: "QR決済" },
  { value: "CHECK", label: "小切手" },
  { value: "OTHER", label: "その他" },
];

export function PaymentsHeader({ status, category }: PaymentsHeaderProps) {
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">入金管理</h2>
        <div className="flex items-center gap-4">
          <Select
            value={status ?? "ALL"}
            onValueChange={(v) => handleFilterChange("status", v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={category ?? "ALL"}
            onValueChange={(v) => handleFilterChange("category", v)}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Button>
        </div>
      </div>

      <PaymentFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
