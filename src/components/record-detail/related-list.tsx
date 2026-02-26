"use client";

/**
 * 関連リストコンポーネント
 *
 * Salesforce の関連リストのように、レコード詳細画面に
 * 親子関係にある子レコードの一覧をインラインで表示する。
 *
 * オプションで「新規」ボタンや行アクション（DropdownMenu）を追加可能。
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RelatedListColumn<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
}

export interface RowAction<T> {
  key: string;
  label: string;
  icon?: LucideIcon;
  variant?: "ghost" | "destructive";
  onClick: (row: T) => void;
  hidden?: (row: T) => boolean;
}

interface RelatedListProps<T> {
  title: string;
  items: T[];
  columns: RelatedListColumn<T>[];
  totalCount: number;
  viewAllHref: string;
  emptyMessage?: string;
  maxItems?: number;
  onNew?: () => void;
  newButtonLabel?: string;
  rowActions?: RowAction<T>[];
}

export function RelatedList<T>({
  title,
  items,
  columns,
  totalCount,
  viewAllHref,
  emptyMessage = "データがありません",
  maxItems = 5,
  onNew,
  newButtonLabel = "新規",
  rowActions,
}: RelatedListProps<T>) {
  const displayItems = items.slice(0, maxItems);
  const hasRowActions = rowActions && rowActions.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {title}
            <span className="text-sm font-normal text-muted-foreground">
              ({totalCount}件)
            </span>
          </CardTitle>
          {onNew && (
            <Button variant="outline" size="sm" onClick={onNew}>
              <Plus className="mr-1 h-4 w-4" />
              {newButtonLabel}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.header} className="whitespace-nowrap">
                      {col.header}
                    </TableHead>
                  ))}
                  {hasRowActions && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((item, idx) => (
                  <TableRow key={idx} className="group/row">
                    {columns.map((col) => (
                      <TableCell key={col.header} className="whitespace-nowrap">
                        {col.accessor(item)}
                      </TableCell>
                    ))}
                    {hasRowActions && (
                      <TableCell className="whitespace-nowrap text-right">
                        <RowActionMenu row={item} actions={rowActions} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {totalCount > maxItems && (
        <CardFooter>
          <Link
            href={viewAllHref}
            className="text-sm text-link hover:text-link-hover active:text-link-active hover:underline"
          >
            すべて表示 ({totalCount}件) →
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * 行アクション用 DropdownMenu
 *
 * ホバー時のみ表示される（group/row + opacity 制御）。
 * hidden 関数が true を返すアクションはメニューから除外する。
 */
function RowActionMenu<T>({
  row,
  actions,
}: {
  row: T;
  actions: RowAction<T>[];
}) {
  const visibleActions = actions.filter((a) => !a.hidden?.(row));

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className="opacity-0 group-hover/row:opacity-100 transition-opacity">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <span className="sr-only">行メニューを開く</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.key}
                onSelect={() => action.onClick(row)}
                className={
                  action.variant === "destructive" ? "text-destructive" : ""
                }
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
