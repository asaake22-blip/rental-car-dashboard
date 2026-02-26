"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { InspectionActions } from "./inspection-actions";

export type InspectionRow = {
  id: string;
  vehicleId: string;
  vehicleCode: string;
  plateNumber: string | null;
  inspectionType: "REGULAR" | "LEGAL" | "SHAKEN" | "MAINTENANCE";
  scheduledDate: string;
  completedDate: string | null;
  isCompleted: boolean;
  note: string | null;
};

const typeLabel: Record<string, string> = {
  REGULAR: "定期点検",
  LEGAL: "法令点検",
  SHAKEN: "車検",
  MAINTENANCE: "整備",
};

const typeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  REGULAR: "default",
  LEGAL: "destructive",
  SHAKEN: "outline",
  MAINTENANCE: "secondary",
};

export const columns: ColumnDef<InspectionRow>[] = [
  {
    accessorKey: "vehicleCode",
    header: "車両",
    cell: ({ row }) => {
      const plate = row.original.plateNumber;
      return (
        <div>
          <Link
            href={`/vehicles/${row.original.vehicleId}`}
            className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
          >
            {row.getValue("vehicleCode")}
          </Link>
          {plate && (
            <span className="ml-1.5 text-xs text-muted-foreground">({plate})</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "inspectionType",
    header: "点検種別",
    cell: ({ row }) => {
      const type = row.getValue("inspectionType") as string;
      return (
        <Badge variant={typeVariant[type] ?? "outline"}>
          {typeLabel[type] ?? type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "scheduledDate",
    header: "予定日",
    cell: ({ row }) => {
      const date = row.getValue("scheduledDate") as string;
      const isCompleted = row.original.isCompleted;
      const isOverdue = !isCompleted && new Date(date) < new Date(new Date().toDateString());
      return (
        <span className={isOverdue ? "text-destructive font-medium" : ""}>
          {new Date(date).toLocaleDateString("ja-JP")}
        </span>
      );
    },
  },
  {
    accessorKey: "completedDate",
    header: "実施日",
    cell: ({ row }) => {
      const date = row.getValue("completedDate") as string | null;
      if (!date) return <span className="text-muted-foreground">-</span>;
      return new Date(date).toLocaleDateString("ja-JP");
    },
  },
  {
    accessorKey: "isCompleted",
    header: "状態",
    cell: ({ row }) => {
      const isCompleted = row.getValue("isCompleted") as boolean;
      if (isCompleted) {
        return (
          <span className="inline-flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            完了
          </span>
        );
      }
      return <span className="text-muted-foreground">未実施</span>;
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <InspectionActions inspection={row.original} />,
    enableSorting: false,
  },
];
