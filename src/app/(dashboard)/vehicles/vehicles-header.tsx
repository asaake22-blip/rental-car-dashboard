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
import { VehicleFormDialog } from "./vehicle-form-dialog";

interface VehiclesHeaderProps {
  status: string | null;
}

const statusOptions = [
  { value: "ALL", label: "全て" },
  { value: "IN_STOCK", label: "在庫" },
  { value: "LEASED", label: "リース中" },
  { value: "MAINTENANCE", label: "整備中" },
  { value: "RETIRED", label: "廃車" },
];

export function VehiclesHeader({ status }: VehiclesHeaderProps) {
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">車両一覧</h2>
        <div className="flex items-center gap-4">
          <Select
            value={status ?? "ALL"}
            onValueChange={handleStatusChange}
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
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規追加
          </Button>
        </div>
      </div>

      <VehicleFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
