"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { QuotationActions } from "./quotation-actions";

export type QuotationRow = {
  id: string;
  quotationCode: string;
  customerName: string;
  accountName: string | null;
  status: string;
  totalAmount: number;
  validUntil: string | null;
};

const statusLabels: Record<string, string> = {
  DRAFT: "下書き",
  SENT: "送付済",
  ACCEPTED: "承諾",
  EXPIRED: "期限切",
  REJECTED: "不成立",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ACCEPTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  EXPIRED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const columns: ColumnDef<QuotationRow>[] = [
  {
    accessorKey: "quotationCode",
    header: "見積番号",
    cell: ({ row }) => (
      <Link
        href={`/quotations/${row.original.id}`}
        className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
      >
        {row.getValue("quotationCode")}
      </Link>
    ),
  },
  { accessorKey: "customerName", header: "宛名" },
  { accessorKey: "accountName", header: "取引先" },
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
    accessorKey: "totalAmount",
    header: "税込金額",
    cell: ({ row }) => {
      const amount = row.getValue("totalAmount") as number;
      return `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
    },
  },
  {
    accessorKey: "validUntil",
    header: "有効期限",
    cell: ({ row }) => {
      const val = row.getValue("validUntil") as string | null;
      if (!val) return "";
      return new Date(val).toLocaleDateString("ja-JP");
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <QuotationActions quotation={row.original} />,
    enableSorting: false,
  },
];
