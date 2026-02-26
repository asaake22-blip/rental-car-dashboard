"use client";

import { type ColumnDef } from "@tanstack/react-table";

export type CompanyRow = {
  customerCompanyCode: string;
  companyNameKana: string;
  officialName: string;
  shortName: string;
  channelCode: string;
};

export const columns: ColumnDef<CompanyRow>[] = [
  { accessorKey: "customerCompanyCode", header: "顧客会社コード" },
  { accessorKey: "officialName", header: "正式名称" },
  { accessorKey: "shortName", header: "略式名称" },
  { accessorKey: "companyNameKana", header: "会社名（カナ）" },
  { accessorKey: "channelCode", header: "チャネルコード" },
];
