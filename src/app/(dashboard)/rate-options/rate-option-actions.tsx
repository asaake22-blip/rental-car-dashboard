"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RateOptionFormDialog } from "./rate-option-form-dialog";
import { RateOptionDeleteDialog } from "./rate-option-delete-dialog";
import type { RateOptionRow } from "./columns";

interface RateOptionActionsProps {
  rateOption: RateOptionRow;
}

export function RateOptionActions({ rateOption }: RateOptionActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">メニューを開く</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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

      <RateOptionFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        rateOption={rateOption}
      />
      <RateOptionDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        rateOptionId={rateOption.id}
        rateOptionName={rateOption.optionName}
      />
    </>
  );
}
