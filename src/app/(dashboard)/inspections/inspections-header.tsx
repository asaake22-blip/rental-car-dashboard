"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InspectionFormDialog } from "./inspection-form-dialog";

interface InspectionsHeaderProps {
  inspectionType: string | null;
  pendingOnly: boolean;
}

const typeOptions = [
  { value: "ALL", label: "全て" },
  { value: "REGULAR", label: "定期点検" },
  { value: "LEGAL", label: "法令点検" },
  { value: "SHAKEN", label: "車検" },
  { value: "MAINTENANCE", label: "整備" },
];

export function InspectionsHeader({ inspectionType, pendingOnly }: InspectionsHeaderProps) {
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePendingOnlyChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("pendingOnly", "true");
    } else {
      params.delete("pendingOnly");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">点検・整備一覧</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="pendingOnly"
              checked={pendingOnly}
              onCheckedChange={(checked) => handlePendingOnlyChange(checked === true)}
            />
            <Label htmlFor="pendingOnly" className="text-sm cursor-pointer">
              未実施のみ
            </Label>
          </div>
          <Select
            value={inspectionType ?? "ALL"}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="点検種別" />
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

      <InspectionFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
