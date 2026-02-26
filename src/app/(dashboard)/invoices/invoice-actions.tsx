"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Send, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { issueInvoice, markInvoicePaid, cancelInvoice } from "@/app/actions/invoice";
import { toast } from "sonner";
import type { InvoiceRow } from "./columns";

interface InvoiceActionsProps {
  invoice: InvoiceRow;
}

/**
 * 請求書テーブルの行アクション（DropdownMenu）
 */
export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canIssue = invoice.status === "DRAFT";
  const canMarkPaid = invoice.status === "ISSUED" || invoice.status === "OVERDUE";
  const canCancel = invoice.status === "DRAFT" || invoice.status === "ISSUED";

  const handleIssue = () => {
    startTransition(async () => {
      const result = await issueInvoice(invoice.id);
      if (result.success) {
        toast.success("請求書を発行しました");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleMarkPaid = () => {
    startTransition(async () => {
      const result = await markInvoicePaid(invoice.id);
      if (result.success) {
        toast.success("入金を確認しました");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelInvoice(invoice.id);
      if (result.success) {
        toast.success("請求書をキャンセルしました");
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
        <DropdownMenuItem onSelect={() => router.push(`/invoices/${invoice.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          詳細を表示
        </DropdownMenuItem>
        {canIssue && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleIssue}>
              <Send className="mr-2 h-4 w-4" />
              発行
            </DropdownMenuItem>
          </>
        )}
        {canMarkPaid && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleMarkPaid}>
              <Check className="mr-2 h-4 w-4" />
              入金確認
            </DropdownMenuItem>
          </>
        )}
        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleCancel} className="text-destructive">
              <XCircle className="mr-2 h-4 w-4" />
              キャンセル
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
