"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditLineDialog } from "./edit-line-dialog";
import { RemoveLineButton } from "./remove-line-button";

interface LineActionsProps {
  contractId: string;
  line: {
    id: string;
    startDate: string;
    endDate: string;
    monthlyAmount: number;
    note: string | null;
    vehicleCode: string;
  };
}

export function LineActions({ contractId, line }: LineActionsProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setEditOpen(true)}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">明細を編集</span>
      </Button>
      <RemoveLineButton
        contractId={contractId}
        lineId={line.id}
        vehicleCode={line.vehicleCode}
      />
      <EditLineDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lineId={line.id}
        vehicleCode={line.vehicleCode}
        initialData={{
          startDate: line.startDate,
          endDate: line.endDate,
          monthlyAmount: line.monthlyAmount,
          note: line.note,
        }}
      />
    </div>
  );
}
