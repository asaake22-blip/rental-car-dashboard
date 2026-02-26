"use client";

import { type ColumnDef } from "@tanstack/react-table";

export type ReservationTargetRow = {
  id: string;
  clientName: string;
  storeName: string;
  officeName: string;
  fiscalYear: number;
  month: number;
  targetCount: number;
};

export type SalesTargetRow = {
  id: string;
  clientName: string;
  storeName: string;
  officeName: string;
  fiscalYear: number;
  month: number;
  targetAmount: string;
};

export const reservationTargetColumns: ColumnDef<ReservationTargetRow>[] = [
  { accessorKey: "clientName", header: "取引先" },
  { accessorKey: "storeName", header: "店舗" },
  { accessorKey: "officeName", header: "営業所" },
  { accessorKey: "fiscalYear", header: "会計年度" },
  { accessorKey: "month", header: "月" },
  { accessorKey: "targetCount", header: "目標件数" },
];

export const salesTargetColumns: ColumnDef<SalesTargetRow>[] = [
  { accessorKey: "clientName", header: "取引先" },
  { accessorKey: "storeName", header: "店舗" },
  { accessorKey: "officeName", header: "営業所" },
  { accessorKey: "fiscalYear", header: "会計年度" },
  { accessorKey: "month", header: "月" },
  { accessorKey: "targetAmount", header: "目標金額" },
];
