"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { PaymentActions } from "./payment-actions";

export type PaymentRow = {
  id: string;
  paymentNumber: string;
  paymentDate: string; // ISO string
  amount: number;
  paymentCategory: string;
  paymentProvider: string | null;
  payerName: string;
  terminalName: string | null;
  terminalId: string | null;
  externalId: string | null;
  status: string;
  allocatedTotal: number;
  note: string | null;
};

export const categoryLabel: Record<string, string> = {
  BANK_TRANSFER: "銀行振込",
  CASH: "現金",
  CREDIT_CARD: "クレジットカード",
  ELECTRONIC_MONEY: "電子マネー",
  QR_PAYMENT: "QR決済",
  CHECK: "小切手",
  OTHER: "その他",
};

export const statusLabel: Record<string, string> = {
  UNALLOCATED: "未消込",
  PARTIALLY_ALLOCATED: "一部消込",
  FULLY_ALLOCATED: "全額消込",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  UNALLOCATED: "secondary",
  PARTIALLY_ALLOCATED: "outline",
  FULLY_ALLOCATED: "default",
};

export const columns: ColumnDef<PaymentRow>[] = [
  {
    accessorKey: "paymentNumber",
    header: "入金番号",
    cell: ({ row }) => (
      <Link
        href={`/payments/${row.original.id}`}
        className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
      >
        {row.getValue("paymentNumber")}
      </Link>
    ),
  },
  {
    accessorKey: "paymentDate",
    header: "入金日",
    cell: ({ row }) =>
      new Date(row.getValue("paymentDate") as string).toLocaleDateString(
        "ja-JP"
      ),
  },
  {
    accessorKey: "amount",
    header: "金額",
    cell: ({ row }) =>
      `\u00a5${(row.getValue("amount") as number).toLocaleString("ja-JP")}`,
  },
  {
    accessorKey: "paymentCategory",
    header: "カテゴリ",
    cell: ({ row }) =>
      categoryLabel[row.getValue("paymentCategory") as string] ??
      row.getValue("paymentCategory"),
    enableSorting: false,
  },
  {
    accessorKey: "paymentProvider",
    header: "プロバイダ",
    cell: ({ row }) => row.getValue("paymentProvider") ?? "-",
    enableSorting: false,
  },
  {
    accessorKey: "payerName",
    header: "入金元",
  },
  {
    accessorKey: "terminalName",
    header: "端末",
    cell: ({ row }) => {
      const name = row.original.terminalName;
      const terminalId = row.original.terminalId;
      if (!name || !terminalId) return "-";
      return (
        <Link
          href={`/terminals/${terminalId}`}
          className="text-link hover:text-link-hover active:text-link-active hover:underline"
        >
          {name}
        </Link>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={statusVariant[status] ?? "outline"}>
          {statusLabel[status] ?? status}
        </Badge>
      );
    },
  },
  {
    id: "allocationRate",
    header: "消込率",
    cell: ({ row }) => {
      const amount = row.original.amount;
      const allocated = row.original.allocatedTotal;
      if (amount === 0) return "0%";
      return `${Math.round((allocated / amount) * 100)}%`;
    },
    enableSorting: false,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <PaymentActions payment={row.original} />,
    enableSorting: false,
  },
];
