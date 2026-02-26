/**
 * 明細行テーブル（読み取り専用）
 *
 * 見積書・請求書の詳細ページで明細行を表示する。
 */

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
}

interface LineItemsTableProps {
  lines: LineItem[];
  /** 税抜合計 */
  subtotal?: number;
  /** 消費税合計 */
  totalTax?: number;
  /** 税込合計 */
  total?: number;
}

function formatAmount(amount: number): string {
  return `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

export function LineItemsTable({
  lines,
  subtotal,
  totalTax,
  total,
}: LineItemsTableProps) {
  // 合計をプロップスから取得するか、行から計算
  const calcSubtotal = subtotal ?? lines.reduce((sum, l) => sum + l.amount, 0);
  const calcTotalTax = totalTax ?? lines.reduce((sum, l) => sum + l.taxAmount, 0);
  const calcTotal = total ?? calcSubtotal + calcTotalTax;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">明細行</CardTitle>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">明細行がありません</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">品名</TableHead>
                  <TableHead className="text-right w-[80px]">数量</TableHead>
                  <TableHead className="text-right w-[100px]">単価</TableHead>
                  <TableHead className="text-right w-[100px]">金額</TableHead>
                  <TableHead className="text-right w-[60px]">税率</TableHead>
                  <TableHead className="text-right w-[100px]">税額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">{formatAmount(line.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatAmount(line.amount)}</TableCell>
                    <TableCell className="text-right">{formatRate(line.taxRate)}</TableCell>
                    <TableCell className="text-right">{formatAmount(line.taxAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    小計
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(calcSubtotal)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    消費税
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right font-medium">
                    {formatAmount(calcTotalTax)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">
                    合計（税込）
                  </TableCell>
                  <TableCell colSpan={3} className="text-right font-bold">
                    {formatAmount(calcTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
