"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { RateOptionActions } from "./rate-option-actions";

export type RateOptionRow = {
  id: string;
  optionName: string;
  price: number;
  isActive: boolean;
};

export const columns: ColumnDef<RateOptionRow>[] = [
  {
    accessorKey: "optionName",
    header: "オプション名",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("optionName")}</span>
    ),
  },
  {
    accessorKey: "price",
    header: "料金",
    cell: ({ row }) => {
      const price = row.getValue("price") as number;
      return `\u00a5${price.toLocaleString()}`;
    },
  },
  {
    accessorKey: "isActive",
    header: "ステータス",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return isActive ? (
        <Badge variant="default" className="bg-green-600">有効</Badge>
      ) : (
        <Badge variant="secondary">無効</Badge>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <RateOptionActions rateOption={row.original} />,
    enableSorting: false,
  },
];
