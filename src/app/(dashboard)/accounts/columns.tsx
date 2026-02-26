"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { AccountActions } from "./account-actions";

export type AccountRow = {
  id: string;
  accountCode: string;
  accountName: string;
  accountNameKana: string | null;
  accountType: string;
  phone: string | null;
  paymentTermsLabel: string | null;
};

const accountTypeLabels: Record<string, string> = {
  CORPORATE: "法人",
  INDIVIDUAL: "個人",
};

export const columns: ColumnDef<AccountRow>[] = [
  {
    accessorKey: "accountCode",
    header: "取引先コード",
    cell: ({ row }) => (
      <Link
        href={`/accounts/${row.original.id}`}
        className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
      >
        {row.getValue("accountCode")}
      </Link>
    ),
  },
  { accessorKey: "accountName", header: "取引先名" },
  {
    accessorKey: "accountType",
    header: "区分",
    cell: ({ row }) => {
      const type = row.getValue("accountType") as string;
      return accountTypeLabels[type] ?? type;
    },
  },
  { accessorKey: "phone", header: "電話番号" },
  { accessorKey: "paymentTermsLabel", header: "支払条件" },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <AccountActions account={row.original} />,
    enableSorting: false,
  },
];
