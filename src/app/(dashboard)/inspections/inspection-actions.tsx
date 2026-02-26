"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InspectionFormDialog } from "./inspection-form-dialog";
import { InspectionDeleteDialog } from "./inspection-delete-dialog";
import { completeInspection } from "@/app/actions/inspection";
import { toast } from "sonner";
import type { InspectionRow } from "./columns";

interface InspectionActionsProps {
  inspection: InspectionRow;
}

export function InspectionActions({ inspection }: InspectionActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleComplete = () => {
    startTransition(async () => {
      const result = await completeInspection(inspection.id);
      if (result.success) {
        toast.success("点検を完了にしました");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
            <span className="sr-only">メニューを開く</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!inspection.isCompleted && (
            <DropdownMenuItem onSelect={handleComplete}>
              <CheckCircle className="mr-2 h-4 w-4" />
              完了にする
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            編集
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InspectionFormDialog open={editOpen} onOpenChange={setEditOpen} inspection={inspection} />
      <InspectionDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        inspectionId={inspection.id}
        vehicleCode={inspection.vehicleCode}
        inspectionType={inspection.inspectionType}
      />
    </>
  );
}
