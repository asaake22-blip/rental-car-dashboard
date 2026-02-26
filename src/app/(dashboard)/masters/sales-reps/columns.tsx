"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export type SalesRepRow = {
  id: string;
  customerCode: string;
  companyCode: string;
  departmentCode: string;
  clientName: string;
  storeName: string;
  officeName: string;
  isNewThisTerm: boolean;
  note: string | null;
  fiscalYear: number;
  month: number;
  salesRepName: string;
};

export const columns: ColumnDef<SalesRepRow>[] = [
  { accessorKey: "salesRepName", header: "担当者名" },
  { accessorKey: "clientName", header: "取引先" },
  { accessorKey: "storeName", header: "店舗" },
  { accessorKey: "officeName", header: "営業所" },
  { accessorKey: "fiscalYear", header: "会計年度" },
  { accessorKey: "month", header: "月" },
  { accessorKey: "customerCode", header: "顧客コード" },
  { accessorKey: "companyCode", header: "会社コード" },
  { accessorKey: "departmentCode", header: "部署コード" },
  {
    accessorKey: "isNewThisTerm",
    header: "今期新規",
    cell: ({ row }) =>
      row.getValue("isNewThisTerm") ? (
        <Badge variant="default">新規</Badge>
      ) : null,
  },
  { accessorKey: "note", header: "備考" },
];
