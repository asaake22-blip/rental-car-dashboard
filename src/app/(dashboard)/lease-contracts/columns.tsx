"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ContractActions } from "./contract-actions";

export type ContractRow = {
  id: string;
  contractNumber: string;
  externalId: string | null;
  lesseeType: "INDIVIDUAL" | "CORPORATE";
  lesseeCompanyCode: string | null;
  lesseeName: string;
  startDate: string; // ISO string
  endDate: string;
  lineCount: number;
  totalMonthlyAmount: number;
  status: "ACTIVE" | "EXPIRED" | "TERMINATED";
  note: string | null;
};

const statusLabel: Record<string, string> = {
  ACTIVE: "有効",
  EXPIRED: "満了",
  TERMINATED: "解約",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  EXPIRED: "outline",
  TERMINATED: "secondary",
};

const lesseeTypeLabel: Record<string, string> = {
  INDIVIDUAL: "個人",
  CORPORATE: "法人",
};

export const columns: ColumnDef<ContractRow>[] = [
  {
    accessorKey: "contractNumber",
    header: "契約番号",
    cell: ({ row }) => (
      <Link
        href={`/lease-contracts/${row.original.id}`}
        className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
      >
        {row.getValue("contractNumber")}
      </Link>
    ),
  },
  {
    accessorKey: "lesseeType",
    header: "区分",
    cell: ({ row }) => lesseeTypeLabel[row.getValue("lesseeType") as string] ?? row.getValue("lesseeType"),
    enableSorting: false,
  },
  {
    accessorKey: "lesseeName",
    header: "リース先名称",
  },
  {
    accessorKey: "startDate",
    header: "開始日",
    cell: ({ row }) => new Date(row.getValue("startDate") as string).toLocaleDateString("ja-JP"),
  },
  {
    accessorKey: "endDate",
    header: "終了日",
    cell: ({ row }) => new Date(row.getValue("endDate") as string).toLocaleDateString("ja-JP"),
  },
  {
    accessorKey: "lineCount",
    header: "車両数",
    cell: ({ row }) => `${row.getValue("lineCount")}台`,
    enableSorting: false,
  },
  {
    accessorKey: "totalMonthlyAmount",
    header: "月額合計",
    cell: ({ row }) => `\u00a5${(row.getValue("totalMonthlyAmount") as number).toLocaleString("ja-JP")}`,
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
    id: "actions",
    header: "",
    cell: ({ row }) => <ContractActions contract={row.original} />,
    enableSorting: false,
  },
];
