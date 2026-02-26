"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { OfficeActions } from "./office-actions";

export type OfficeRow = {
  id: string;
  officeName: string;
  area: string | null;
  vehicleCount: number;
  parkingLotCount: number;
};

export const columns: ColumnDef<OfficeRow>[] = [
  {
    accessorKey: "officeName",
    header: "営業所名",
    cell: ({ row }) => (
      <Link
        href={`/offices/${row.original.id}`}
        className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
      >
        {row.getValue("officeName")}
      </Link>
    ),
  },
  { accessorKey: "area", header: "エリア" },
  {
    accessorKey: "vehicleCount",
    header: "車両数",
    cell: ({ row }) => `${row.getValue("vehicleCount")} 台`,
  },
  {
    accessorKey: "parkingLotCount",
    header: "駐車場数",
    cell: ({ row }) => `${row.getValue("parkingLotCount")} 箇所`,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <OfficeActions office={row.original} />,
    enableSorting: false,
  },
];
