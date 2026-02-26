"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RatePlanFormDialog } from "./rate-plan-form-dialog";

interface RatePlanHeaderProps {
  vehicleClasses: { id: string; className: string }[];
}

export function RatePlanHeader({ vehicleClasses }: RatePlanHeaderProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">料金プラン管理</h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      </div>

      <RatePlanFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        vehicleClasses={vehicleClasses}
      />
    </>
  );
}
