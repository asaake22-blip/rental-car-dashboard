"use client";

/**
 * 明細行エディタ（見積書・請求書共通）
 *
 * 明細行の追加・削除・編集を行うフォームコンポーネント。
 * JSON.stringify して hidden input に格納し、Server Actions で受け取る。
 */

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface LineItemsEditorProps {
  /** hidden input の name 属性 */
  name: string;
  /** 初期表示する明細行 */
  defaultLines?: LineItem[];
  /** 無効化 */
  disabled?: boolean;
}

const defaultLine: LineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 0.10,
};

function calcLineAmount(line: LineItem): number {
  return Math.floor(line.quantity * line.unitPrice);
}

function calcLineTax(line: LineItem): number {
  return Math.floor(calcLineAmount(line) * line.taxRate);
}

export function LineItemsEditor({
  name,
  defaultLines,
  disabled = false,
}: LineItemsEditorProps) {
  const [lines, setLines] = useState<LineItem[]>(
    defaultLines && defaultLines.length > 0 ? defaultLines : [{ ...defaultLine }],
  );

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, { ...defaultLine }]);
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateLine = useCallback((index: number, field: keyof LineItem, value: string) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (field === "description") {
          return { ...line, description: value };
        }
        const numValue = Number(value) || 0;
        return { ...line, [field]: numValue };
      }),
    );
  }, []);

  // 合計計算
  const subtotal = lines.reduce((sum, line) => sum + calcLineAmount(line), 0);
  const totalTax = lines.reduce((sum, line) => sum + calcLineTax(line), 0);
  const total = subtotal + totalTax;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>明細行</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLine}
          disabled={disabled}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          行追加
        </Button>
      </div>

      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="grid gap-2 rounded-md border p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">品名</Label>
                <Input
                  value={line.description}
                  onChange={(e) => updateLine(idx, "description", e.target.value)}
                  placeholder="品名・摘要"
                  disabled={disabled}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(idx)}
                  disabled={disabled || lines.length <= 1}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">数量</Label>
                <Input
                  type="number"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                  min={0}
                  step="0.01"
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">単価</Label>
                <Input
                  type="number"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(idx, "unitPrice", e.target.value)}
                  min={0}
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">税率</Label>
                <Input
                  type="number"
                  value={line.taxRate}
                  onChange={(e) => updateLine(idx, "taxRate", e.target.value)}
                  min={0}
                  max={1}
                  step="0.01"
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">金額</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm">
                  {new Intl.NumberFormat("ja-JP").format(calcLineAmount(line))}円
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 合計表示 */}
      <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">小計</span>
          <span>{new Intl.NumberFormat("ja-JP").format(subtotal)}円</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">消費税</span>
          <span>{new Intl.NumberFormat("ja-JP").format(totalTax)}円</span>
        </div>
        <div className="flex justify-between font-medium border-t pt-1">
          <span>合計</span>
          <span>{new Intl.NumberFormat("ja-JP").format(total)}円</span>
        </div>
      </div>

      {/* hidden input で JSON を送信 */}
      <input type="hidden" name={name} value={JSON.stringify(lines)} />
    </div>
  );
}
