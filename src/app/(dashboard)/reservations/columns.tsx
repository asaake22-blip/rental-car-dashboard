"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ReservationActions } from "./reservation-actions";

export type ReservationRow = {
  id: string;
  reservationCode: string;
  status: string;
  customerName: string;
  vehicleClassName: string;
  pickupDate: string; // ISO 日時文字列
  returnDate: string; // ISO 日時文字列
  pickupOfficeName: string;
  estimatedAmount: number | null;
};

const statusLabels: Record<string, string> = {
  RESERVED: "予約",
  CONFIRMED: "配車済",
  DEPARTED: "出発中",
  RETURNED: "帰着",
  SETTLED: "精算済",
  CANCELLED: "キャンセル",
  NO_SHOW: "ノーショー",
};

const statusColors: Record<string, string> = {
  RESERVED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CONFIRMED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  DEPARTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  RETURNED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  SETTLED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  NO_SHOW: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const columns: ColumnDef<ReservationRow>[] = [
  {
    accessorKey: "reservationCode",
    header: "予約番号",
    cell: ({ row }) => (
      <Link
        href={`/reservations/${row.original.id}`}
        className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
      >
        {row.getValue("reservationCode")}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status] ?? ""}`}
        >
          {statusLabels[status] ?? status}
        </span>
      );
    },
  },
  {
    accessorKey: "customerName",
    header: "顧客名",
  },
  {
    accessorKey: "vehicleClassName",
    header: "車両クラス",
  },
  {
    accessorKey: "pickupDate",
    header: "出発予定",
    cell: ({ row }) => formatDateTime(row.getValue("pickupDate")),
  },
  {
    accessorKey: "returnDate",
    header: "帰着予定",
    cell: ({ row }) => formatDateTime(row.getValue("returnDate")),
  },
  {
    accessorKey: "pickupOfficeName",
    header: "出発営業所",
  },
  {
    accessorKey: "estimatedAmount",
    header: "見積金額",
    cell: ({ row }) => {
      const amount = row.getValue("estimatedAmount") as number | null;
      if (amount === null || amount === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }
      return `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ReservationActions reservation={row.original} />,
    enableSorting: false,
  },
];
