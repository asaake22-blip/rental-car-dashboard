"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Send, Check, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  deleteQuotation,
} from "@/app/actions/quotation";
import { toast } from "sonner";
import type { QuotationRow } from "./columns";

interface QuotationActionsProps {
  quotation: QuotationRow;
}

/**
 * 見積書テーブルの行アクション（DropdownMenu）
 */
export function QuotationActions({ quotation }: QuotationActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canSend = quotation.status === "DRAFT";
  const canAccept = quotation.status === "SENT";
  const canReject = quotation.status === "SENT";
  const canDelete = quotation.status === "DRAFT";

  const handleSend = () => {
    startTransition(async () => {
      const result = await sendQuotation(quotation.id);
      if (result.success) {
        toast.success("見積書を送付しました");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptQuotation(quotation.id);
      if (result.success) {
        toast.success("見積書を承諾しました");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectQuotation(quotation.id);
      if (result.success) {
        toast.success("見積書を不成立にしました");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteQuotation(quotation.id);
      if (result.success) {
        toast.success("見積書を削除しました");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
          <span className="sr-only">メニューを開く</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => router.push(`/quotations/${quotation.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          詳細を表示
        </DropdownMenuItem>
        {canSend && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSend}>
              <Send className="mr-2 h-4 w-4" />
              送付
            </DropdownMenuItem>
          </>
        )}
        {canAccept && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleAccept}>
              <Check className="mr-2 h-4 w-4" />
              承諾
            </DropdownMenuItem>
          </>
        )}
        {canReject && (
          <DropdownMenuItem onSelect={handleReject} className="text-destructive">
            <XCircle className="mr-2 h-4 w-4" />
            不成立
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
