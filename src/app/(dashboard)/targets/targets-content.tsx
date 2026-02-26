"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table/data-table";
import {
  reservationTargetColumns,
  salesTargetColumns,
  type ReservationTargetRow,
  type SalesTargetRow,
} from "./columns";
import type { ServerTableState } from "@/lib/data-table/types";

interface TargetsContentProps {
  reservationTargetRows: ReservationTargetRow[];
  salesTargetRows: SalesTargetRow[];
  otState: ServerTableState;
  stState: ServerTableState;
}

export function TargetsContent({
  reservationTargetRows,
  salesTargetRows,
  otState,
  stState,
}: TargetsContentProps) {
  return (
    <Tabs defaultValue="reservation">
      <TabsList>
        <TabsTrigger value="reservation">予約目標</TabsTrigger>
        <TabsTrigger value="sales">売上目標</TabsTrigger>
      </TabsList>
      <TabsContent value="reservation" className="mt-4">
        <DataTable
          columns={reservationTargetColumns}
          data={reservationTargetRows}
          searchPlaceholder="取引先・店舗で検索..."
          paramPrefix="rt"
          totalCount={otState.totalCount}
          page={otState.page}
          pageSize={otState.pageSize}
          totalPages={otState.totalPages}
          search={otState.search}
          sortBy={otState.sortBy}
          sortOrder={otState.sortOrder}
        />
      </TabsContent>
      <TabsContent value="sales" className="mt-4">
        <DataTable
          columns={salesTargetColumns}
          data={salesTargetRows}
          searchPlaceholder="取引先・店舗で検索..."
          paramPrefix="st"
          totalCount={stState.totalCount}
          page={stState.page}
          pageSize={stState.pageSize}
          totalPages={stState.totalPages}
          search={stState.search}
          sortBy={stState.sortBy}
          sortOrder={stState.sortOrder}
        />
      </TabsContent>
    </Tabs>
  );
}
