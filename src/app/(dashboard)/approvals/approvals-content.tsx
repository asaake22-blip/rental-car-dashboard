"use client";

import { useState } from "react";
import { type RowSelectionState } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import {
  reservationApprovalColumns,
  type ReservationApprovalRow,
} from "./approval-columns";
import { BulkApprovalBar } from "./bulk-approval-bar";
import { ApprovalDialog } from "./approval-dialog";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { ServerTableState } from "@/lib/data-table/types";
import { type ColumnDef } from "@tanstack/react-table";

interface ApprovalsContentProps {
  rows: ReservationApprovalRow[];
  tableState: ServerTableState;
}

export function ApprovalsContent({ rows, tableState }: ApprovalsContentProps) {
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    id: string;
    label: string;
    action: "APPROVED" | "REJECTED";
  }>({ open: false, id: "", label: "", action: "APPROVED" });

  const selectedIds = Object.keys(selection).filter((k) => selection[k]);

  const openDialog = (id: string, label: string, action: "APPROVED" | "REJECTED") => {
    setDialogState({ open: true, id, label, action });
  };

  const columnsWithActions: ColumnDef<ReservationApprovalRow, unknown>[] = [
    ...reservationApprovalColumns,
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => openDialog(row.original.id, row.original.reservationCode, "APPROVED")}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            承認
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-destructive hover:text-destructive"
            onClick={() => openDialog(row.original.id, row.original.reservationCode, "REJECTED")}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            却下
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  return (
    <>
      <DataTable
        columns={columnsWithActions}
        data={rows}
        searchPlaceholder="予約番号・顧客名で検索..."
        totalCount={tableState.totalCount}
        page={tableState.page}
        pageSize={tableState.pageSize}
        totalPages={tableState.totalPages}
        search={tableState.search}
        sortBy={tableState.sortBy}
        sortOrder={tableState.sortOrder}
        enableRowSelection
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        getRowId={(row) => row.id}
      />

      <BulkApprovalBar
        selectedIds={selectedIds}
        onComplete={() => setSelection({})}
      />

      <ApprovalDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        targetId={dialogState.id}
        targetLabel={dialogState.label}
        action={dialogState.action}
      />
    </>
  );
}
