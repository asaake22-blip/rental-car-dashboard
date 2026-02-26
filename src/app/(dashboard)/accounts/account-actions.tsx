"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { deleteAccount } from "@/app/actions/account";
import { toast } from "sonner";
import type { AccountRow } from "./columns";

interface AccountActionsProps {
  account: AccountRow;
}

/**
 * 取引先テーブルの行アクション（DropdownMenu）
 */
export function AccountActions({ account }: AccountActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteAccount(account.id);
      if (result.success) {
        toast.success("取引先を削除しました");
        setDeleteOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
            <span className="sr-only">メニューを開く</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => router.push(`/accounts/${account.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            詳細を表示
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="取引先の削除"
        description={`取引先「${account.accountName}」を削除しますか？関連する見積書・請求書・予約がある場合は削除できません。`}
        actionLabel="削除"
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </>
  );
}
