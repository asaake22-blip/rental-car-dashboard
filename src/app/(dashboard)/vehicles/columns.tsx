"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { VehicleActions } from "./vehicle-actions";

export type VehicleRow = {
  id: string;
  vehicleCode: string;
  plateNumber: string | null;
  vin: string | null;
  maker: string;
  modelName: string;
  year: number;
  color: string | null;
  mileage: number;
  status: "IN_STOCK" | "LEASED" | "MAINTENANCE" | "RETIRED";
  officeId: string;
  officeName: string | null;
};

const statusLabel: Record<string, string> = {
  IN_STOCK: "在庫",
  LEASED: "リース中",
  MAINTENANCE: "整備中",
  RETIRED: "廃車",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  IN_STOCK: "default",
  LEASED: "secondary",
  MAINTENANCE: "outline",
  RETIRED: "destructive",
};

export const columns: ColumnDef<VehicleRow>[] = [
  {
    accessorKey: "vehicleCode",
    header: "車両コード",
    cell: ({ row }) => (
      <Link
        href={`/vehicles/${row.original.id}`}
        className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
      >
        {row.getValue("vehicleCode")}
      </Link>
    ),
  },
  {
    accessorKey: "plateNumber",
    header: "ナンバープレート",
    cell: ({ row }) => {
      const plate = row.getValue("plateNumber") as string | null;
      if (!plate) return <span className="text-muted-foreground">-</span>;
      return plate;
    },
  },
  { accessorKey: "maker", header: "メーカー" },
  { accessorKey: "modelName", header: "車種名" },
  {
    accessorKey: "year",
    header: "年式",
  },
  { accessorKey: "color", header: "色" },
  {
    accessorKey: "mileage",
    header: "走行距離",
    cell: ({ row }) => {
      const mileage = row.getValue("mileage") as number;
      return `${mileage.toLocaleString("ja-JP")} km`;
    },
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
    accessorKey: "officeName",
    header: "営業所",
    cell: ({ row }) => {
      const name = row.getValue("officeName") as string | null;
      const officeId = row.original.officeId;
      if (!name) return <span className="text-muted-foreground">-</span>;
      return (
        <Link href={`/offices/${officeId}`} className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium">
          {name}
        </Link>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <VehicleActions vehicle={row.original} />,
    enableSorting: false,
  },
];
