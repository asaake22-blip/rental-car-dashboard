"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type OnChangeFn,
} from "@tanstack/react-table";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  paramPrefix?: string;
  /** 行選択サポート（承認一覧で使用） */
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  getRowId?: (row: TData) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "検索...",
  totalCount,
  page,
  pageSize,
  totalPages,
  search,
  sortBy,
  sortOrder,
  paramPrefix,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(search);
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(currentSearchParams.toString());
      const prefix = paramPrefix ? `${paramPrefix}_` : "";
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(`${prefix}${key}`);
        } else {
          params.set(`${prefix}${key}`, value);
        }
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, currentSearchParams, paramPrefix, startTransition]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput || undefined, page: "1" });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === "desc" }]
    : [];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      ...(enableRowSelection && rowSelection !== undefined ? { rowSelection } : {}),
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: totalPages,
    enableRowSelection,
    onRowSelectionChange,
    getRowId,
  });

  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      updateParams({ sortOrder: sortOrder === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sortBy: columnId, sortOrder: "desc", page: "1" });
    }
  };

  // ページ番号直接入力の確定処理
  const commitPageInput = () => {
    const parsed = parseInt(pageInput, 10);
    if (isNaN(parsed)) {
      setPageInput(String(page));
      return;
    }
    const clamped = Math.max(1, Math.min(parsed, totalPages || 1));
    setPageInput(String(clamped));
    if (clamped !== page) {
      updateParams({ page: String(clamped) });
    }
  };

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  // ページネーションUI（上下で再利用、関数呼び出しでフォーカス維持）
  const renderPaginationControls = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">表示件数</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) =>
            updateParams({ pageSize: value, page: "1" })
          }
        >
          <SelectTrigger className="w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-2">
          {from}-{to} / {totalCount.toLocaleString()} 件
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={totalPages || 1}
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitPageInput();
          }}
          onBlur={commitPageInput}
          className="w-16 text-center h-9"
        />
        <span className="text-sm text-muted-foreground">
          / {totalPages || 1} ページ
        </span>
        <Button variant="outline" size="icon" onClick={() => updateParams({ page: "1" })} disabled={page <= 1}>
          <ChevronsLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => updateParams({ page: String(page - 1) })} disabled={page <= 1}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => updateParams({ page: String(page + 1) })} disabled={page >= totalPages}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => updateParams({ page: String(totalPages) })} disabled={page >= totalPages}>
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={searchPlaceholder}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto text-sm text-muted-foreground">
          {totalCount.toLocaleString()} 件
        </div>
      </div>

      {/* 上部ページネーション */}
      {renderPaginationControls()}

      {/* テーブル */}
      <div
        className={cn(
          "rounded-md border overflow-x-auto",
          isPending && "opacity-50 pointer-events-none transition-opacity"
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "flex items-center gap-1 cursor-pointer select-none"
                            : ""
                        }
                        onClick={() => {
                          if (header.column.getCanSort()) {
                            handleSort(header.column.id);
                          }
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          sortBy === header.column.id ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="size-3 text-foreground" />
                            ) : (
                              <ArrowDown className="size-3 text-foreground" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 text-muted-foreground" />
                          )
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 下部ページネーション */}
      {renderPaginationControls()}
    </div>
  );
}
