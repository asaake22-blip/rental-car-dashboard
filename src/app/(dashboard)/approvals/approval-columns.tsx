"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

export type ReservationApprovalRow = {
  id: string;
  reservationCode: string;
  customerName: string;
  pickupDate: string;
  pickupOfficeName: string;
  estimatedAmount: number | null;
  channel: string | null;
};

function selectColumn<T>(): ColumnDef<T, unknown> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="全選択"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="行を選択"
      />
    ),
    enableSorting: false,
  };
}

export const reservationApprovalColumns: ColumnDef<ReservationApprovalRow, unknown>[] = [
  selectColumn<ReservationApprovalRow>(),
  { accessorKey: "reservationCode", header: "予約番号" },
  { accessorKey: "customerName", header: "顧客名" },
  {
    accessorKey: "pickupDate",
    header: "出発予定",
    cell: ({ row }) => {
      const dateStr = row.getValue("pickupDate") as string;
      return new Date(dateStr).toLocaleDateString("ja-JP");
    },
  },
  { accessorKey: "pickupOfficeName", header: "出発営業所" },
  {
    accessorKey: "estimatedAmount",
    header: "見積金額",
    cell: ({ row }) => {
      const amount = row.getValue("estimatedAmount") as number | null;
      if (amount === null || amount === undefined) return "-";
      return `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
    },
  },
  { accessorKey: "channel", header: "チャネル" },
];
