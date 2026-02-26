"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { RatePlanActions } from "./rate-plan-actions";

export type RatePlanRow = {
  id: string;
  planName: string;
  vehicleClassId: string;
  vehicleClassName: string;
  rateType: "HOURLY" | "DAILY" | "OVERNIGHT";
  basePrice: number;
  additionalHourPrice: number;
  insurancePrice: number;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
};

const rateTypeLabels: Record<RatePlanRow["rateType"], string> = {
  HOURLY: "時間制",
  DAILY: "日割",
  OVERNIGHT: "泊数制",
};

const rateTypeBadgeColors: Record<RatePlanRow["rateType"], string> = {
  HOURLY: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  DAILY: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  OVERNIGHT: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

/**
 * カラム定義を生成する関数
 * vehicleClasses をアクションメニューに渡すため関数パターンを使用
 */
export function createColumns(
  vehicleClasses: { id: string; className: string }[]
): ColumnDef<RatePlanRow>[] {
  return [
    {
      accessorKey: "planName",
      header: "プラン名",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("planName")}</span>
      ),
    },
    {
      accessorKey: "vehicleClassName",
      header: "車両クラス",
    },
    {
      accessorKey: "rateType",
      header: "料金タイプ",
      cell: ({ row }) => {
        const rateType = row.getValue("rateType") as RatePlanRow["rateType"];
        return (
          <Badge variant="outline" className={rateTypeBadgeColors[rateType]}>
            {rateTypeLabels[rateType]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "basePrice",
      header: "基本料金",
      cell: ({ row }) => {
        const price = row.getValue("basePrice") as number;
        return `\u00a5${price.toLocaleString()}`;
      },
    },
    {
      accessorKey: "additionalHourPrice",
      header: "超過料金/h",
      cell: ({ row }) => {
        const price = row.getValue("additionalHourPrice") as number;
        if (price === 0) return <span className="text-muted-foreground">-</span>;
        return `\u00a5${price.toLocaleString()}`;
      },
    },
    {
      accessorKey: "insurancePrice",
      header: "免責補償料/日",
      cell: ({ row }) => {
        const price = row.getValue("insurancePrice") as number;
        if (price === 0) return <span className="text-muted-foreground">-</span>;
        return `\u00a5${price.toLocaleString()}`;
      },
    },
    {
      id: "period",
      header: "有効期間",
      cell: ({ row }) => {
        const from = row.original.validFrom;
        const to = row.original.validTo;
        return (
          <span className="text-sm">
            {from}{to ? ` ~ ${to}` : " ~"}
          </span>
        );
      },
      enableSorting: false,
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
      cell: ({ row }) => (
        <RatePlanActions ratePlan={row.original} vehicleClasses={vehicleClasses} />
      ),
      enableSorting: false,
    },
  ];
}
