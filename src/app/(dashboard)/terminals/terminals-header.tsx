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
import { TerminalFormDialog } from "./terminal-form-dialog";

interface TerminalsHeaderProps {
  status: string | null;
  terminalType: string | null;
}

const statusOptions = [
  { value: "ALL", label: "全て" },
  { value: "ACTIVE", label: "稼働中" },
  { value: "INACTIVE", label: "停止中" },
  { value: "MAINTENANCE", label: "メンテナンス中" },
];

const typeOptions = [
  { value: "ALL", label: "全種別" },
  { value: "CREDIT_CARD", label: "クレジットカード" },
  { value: "ELECTRONIC_MONEY", label: "電子マネー" },
  { value: "QR_PAYMENT", label: "QR決済" },
  { value: "MULTI", label: "マルチ決済" },
];

export function TerminalsHeader({
  status,
  terminalType,
}: TerminalsHeaderProps) {
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
        <h2 className="text-2xl font-bold">決済端末管理</h2>
        <div className="flex items-center gap-4">
          <Select
            value={status ?? "ALL"}
            onValueChange={(v) => handleFilterChange("status", v)}
          >
            <SelectTrigger className="w-[160px]">
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
            value={terminalType ?? "ALL"}
            onValueChange={(v) => handleFilterChange("terminalType", v)}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="種別" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => (
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

      <TerminalFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
