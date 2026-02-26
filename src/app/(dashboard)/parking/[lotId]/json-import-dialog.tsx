"use client";

import { useTransition, useState } from "react";
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
import { importParkingSpots } from "@/app/actions/parking";
import { toast } from "sonner";

interface JsonImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotId: string;
}

const sampleJson = `{
  "spots": [
    { "number": "A-1", "x": 10, "y": 10, "width": 60, "height": 120, "rotation": 0 },
    { "number": "A-2", "x": 80, "y": 10, "width": 60, "height": 120, "rotation": 0 }
  ]
}`;

export function JsonImportDialog({ open, onOpenChange, lotId }: JsonImportDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleImport = () => {
    setError(null);
    startTransition(async () => {
      const result = await importParkingSpots(lotId, jsonText);
      if (result.success) {
        toast.success("スポットをインポートしました");
        setJsonText("");
        handleOpenChange(false);
      } else {
        setError(result.error ?? "インポートに失敗しました");
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>JSON インポート</DialogTitle>
          <DialogDescription>
            駐車スポットの配置を JSON 形式でインポートします。
            既存のスポットはすべて置き換えられます。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={sampleJson}
            rows={12}
            className="font-mono text-sm"
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            number: スポット番号、x/y: 左上座標、width/height: サイズ、rotation: 回転角度（度）
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={handleImport} disabled={isPending || !jsonText.trim()}>
            {isPending ? "インポート中..." : "インポート"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
