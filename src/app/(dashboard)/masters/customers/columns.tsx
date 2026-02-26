"use client";

import { type ColumnDef } from "@tanstack/react-table";

export type CustomerRow = {
  id: string;
  area: string | null;
  dealer: string | null;
  channelCode: string;
  departmentCode: string;
  companyCode: string;
  customerCompanyCode: string;
  departmentCustomerCode: string;
  departmentCustomerName: string;
  departmentCustomerNameKana: string;
  shortName: string;
};

export const columns: ColumnDef<CustomerRow>[] = [
  { accessorKey: "departmentCustomerCode", header: "部署・顧客コード" },
  { accessorKey: "departmentCustomerName", header: "部署・顧客名称" },
  { accessorKey: "departmentCustomerNameKana", header: "部署・顧客名（カナ）" },
  { accessorKey: "shortName", header: "略式名称" },
  { accessorKey: "area", header: "エリア" },
  { accessorKey: "dealer", header: "ディーラー" },
  { accessorKey: "channelCode", header: "チャネルコード" },
  { accessorKey: "departmentCode", header: "部署コード" },
  { accessorKey: "companyCode", header: "会社コード" },
  { accessorKey: "customerCompanyCode", header: "顧客会社コード" },
];
