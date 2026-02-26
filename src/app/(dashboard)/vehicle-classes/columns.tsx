"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { VehicleClassActions } from "./vehicle-class-actions";

export type VehicleClassRow = {
  id: string;
  classCode: string;
  className: string;
  description: string | null;
  sortOrder: number;
  vehicleCount: number;
};

export const columns: ColumnDef<VehicleClassRow>[] = [
  {
    accessorKey: "classCode",
    header: "クラスコード",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("classCode")}</span>
    ),
  },
  {
    accessorKey: "className",
    header: "クラス名",
  },
  {
    accessorKey: "description",
    header: "説明",
    cell: ({ row }) => {
      const desc = row.getValue("description") as string | null;
      if (!desc) return <span className="text-muted-foreground">-</span>;
      return desc;
    },
  },
  {
    accessorKey: "sortOrder",
    header: "表示順",
  },
  {
    accessorKey: "vehicleCount",
    header: "車両数",
    cell: ({ row }) => `${row.getValue("vehicleCount")} 台`,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <VehicleClassActions vehicleClass={row.original} />,
    enableSorting: false,
  },
];
