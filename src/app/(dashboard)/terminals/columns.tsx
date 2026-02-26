"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { TerminalActions } from "./terminal-actions";

export type TerminalRow = {
  id: string;
  terminalCode: string;
  terminalName: string;
  terminalType: string;
  provider: string | null;
  officeName: string;
  officeId: string;
  status: string;
  serialNumber: string | null;
  modelName: string | null;
  paymentCount: number;
  note: string | null;
};

export const terminalTypeLabel: Record<string, string> = {
  CREDIT_CARD: "クレジットカード",
  ELECTRONIC_MONEY: "電子マネー",
  QR_PAYMENT: "QR決済",
  MULTI: "マルチ決済",
};

export const terminalStatusLabel: Record<string, string> = {
  ACTIVE: "稼働中",
  INACTIVE: "停止中",
  MAINTENANCE: "メンテナンス中",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  MAINTENANCE: "outline",
};

export const columns: ColumnDef<TerminalRow>[] = [
  {
    accessorKey: "terminalCode",
    header: "端末コード",
    cell: ({ row }) => (
      <Link
        href={`/terminals/${row.original.id}`}
        className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
      >
        {row.getValue("terminalCode")}
      </Link>
    ),
  },
  {
    accessorKey: "terminalName",
    header: "名称",
  },
  {
    accessorKey: "terminalType",
    header: "種別",
    cell: ({ row }) =>
      terminalTypeLabel[row.getValue("terminalType") as string] ??
      row.getValue("terminalType"),
    enableSorting: false,
  },
  {
    accessorKey: "provider",
    header: "プロバイダ",
    cell: ({ row }) => row.getValue("provider") ?? "-",
    enableSorting: false,
  },
  {
    accessorKey: "officeName",
    header: "営業所",
  },
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={statusVariant[status] ?? "outline"}>
          {terminalStatusLabel[status] ?? status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "paymentCount",
    header: "入金件数",
    cell: ({ row }) => `${row.getValue("paymentCount")}件`,
    enableSorting: false,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <TerminalActions terminal={row.original} />,
    enableSorting: false,
  },
];
