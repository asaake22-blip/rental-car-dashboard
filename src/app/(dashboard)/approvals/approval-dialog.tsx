"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { approve } from "@/app/actions/approval";
import { toast } from "sonner";

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  targetLabel: string;
  action: "APPROVED" | "REJECTED";
}

/**
 * 個別承認/却下ダイアログ
 *
 * コメント入力付き。承認一覧から使用。
 */
export function ApprovalDialog({
  open,
  onOpenChange,
  targetId,
  targetLabel,
  action,
}: ApprovalDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isApprove = action === "APPROVED";
  const title = isApprove ? "承認" : "却下";

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setComment("");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await approve(targetId, action, comment || undefined);
      if (result.success) {
        toast.success(`${targetLabel}を${title}しました`);
        handleOpenChange(false);
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{targetLabel}を{title}</DialogTitle>
          <DialogDescription>
            {isApprove
              ? "このデータを承認します。"
              : "このデータを却下します。理由をコメントに記入してください。"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="approval-comment">コメント（任意）</Label>
          <Textarea
            id="approval-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isApprove ? "承認コメント..." : "却下理由..."}
            rows={3}
            disabled={isPending}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button
            variant={isApprove ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "処理中..." : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
