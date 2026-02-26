"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { InvoiceActions } from "./invoice-actions";

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  accountName: string | null;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: string;
};

const statusLabels: Record<string, string> = {
  DRAFT: "下書き",
  ISSUED: "発行済",
  PAID: "入金済",
  OVERDUE: "延滞",
  CANCELLED: "取消",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  ISSUED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500",
};

export const columns: ColumnDef<InvoiceRow>[] = [
  {
    accessorKey: "invoiceNumber",
    header: "請求書番号",
    cell: ({ row }) => (
      <Link
        href={`/invoices/${row.original.id}`}
        className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
      >
        {row.getValue("invoiceNumber")}
      </Link>
    ),
  },
  { accessorKey: "customerName", header: "顧客名" },
  {
    accessorKey: "accountName",
    header: "取引先",
    cell: ({ row }) => {
      const v = row.getValue("accountName") as string | null;
      return v ?? "-";
    },
  },
  {
    accessorKey: "issueDate",
    header: "発行日",
    cell: ({ row }) =>
      new Date(row.getValue("issueDate") as string).toLocaleDateString("ja-JP"),
  },
  {
    accessorKey: "dueDate",
    header: "支払期日",
    cell: ({ row }) =>
      new Date(row.getValue("dueDate") as string).toLocaleDateString("ja-JP"),
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
    id: "actions",
    header: "",
    cell: ({ row }) => <InvoiceActions invoice={row.original} />,
    enableSorting: false,
  },
];
