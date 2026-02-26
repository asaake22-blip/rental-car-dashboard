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
import { VehicleClassFormDialog } from "./vehicle-class-form-dialog";
import { VehicleClassDeleteDialog } from "./vehicle-class-delete-dialog";
import type { VehicleClassRow } from "./columns";

interface VehicleClassActionsProps {
  vehicleClass: VehicleClassRow;
}

export function VehicleClassActions({ vehicleClass }: VehicleClassActionsProps) {
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

      <VehicleClassFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        vehicleClass={vehicleClass}
      />
      <VehicleClassDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        vehicleClassId={vehicleClass.id}
        vehicleClassName={vehicleClass.className}
      />
    </>
  );
}
