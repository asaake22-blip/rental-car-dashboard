"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { bulkApprove } from "@/app/actions/approval";
import { toast } from "sonner";

interface BulkApprovalBarProps {
  selectedIds: string[];
  onComplete: () => void;
}

/**
 * 一括承認操作バー
 *
 * 選択行が1件以上ある場合に画面下部に固定表示。
 */
export function BulkApprovalBar({ selectedIds, onComplete }: BulkApprovalBarProps) {
  const [isPending, startTransition] = useTransition();
  const count = selectedIds.length;

  if (count === 0) return null;

  const handleBulk = (status: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const result = await bulkApprove(selectedIds, status);
      if (result.success) {
        const label = status === "APPROVED" ? "承認" : "却下";
        toast.success(`${result.data?.count ?? count}件を${label}しました`);
        onComplete();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-6 py-3 shadow-lg">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <span className="text-sm font-medium">
          {count}件を選択中
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleBulk("APPROVED")}
            disabled={isPending}
          >
            <Check className="mr-1.5 h-4 w-4" />
            {isPending ? "処理中..." : `${count}件を一括承認`}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleBulk("REJECTED")}
            disabled={isPending}
          >
            <X className="mr-1.5 h-4 w-4" />
            {isPending ? "処理中..." : `${count}件を一括却下`}
          </Button>
        </div>
      </div>
    </div>
  );
}
