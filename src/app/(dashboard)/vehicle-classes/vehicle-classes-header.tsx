"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleClassFormDialog } from "./vehicle-class-form-dialog";

export function VehicleClassesHeader() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">車両クラス管理</h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      </div>

      <VehicleClassFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
