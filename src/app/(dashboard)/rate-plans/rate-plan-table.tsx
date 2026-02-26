"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createColumns, type RatePlanRow } from "./columns";

interface RatePlanTableProps {
  data: RatePlanRow[];
  vehicleClasses: { id: string; className: string }[];
  searchPlaceholder: string;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

/**
 * 料金プランテーブル
 *
 * columns 生成時に vehicleClasses を渡すため Client Component でラップ。
 * 行アクションの編集ダイアログで車両クラス選択肢として使用する。
 */
export function RatePlanTable({
  data,
  vehicleClasses,
  searchPlaceholder,
  totalCount,
  page,
  pageSize,
  totalPages,
  search,
  sortBy,
  sortOrder,
}: RatePlanTableProps) {
  const columns = useMemo(
    () => createColumns(vehicleClasses),
    [vehicleClasses]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder={searchPlaceholder}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      search={search}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  );
}
