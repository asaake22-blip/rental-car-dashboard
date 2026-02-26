"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfficeFormDialog } from "./office-form-dialog";

export function OfficesHeader() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">営業所マスタ</h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      </div>

      <OfficeFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
