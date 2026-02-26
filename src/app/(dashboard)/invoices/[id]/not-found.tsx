import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InvoiceNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <h2 className="text-2xl font-bold">請求書が見つかりません</h2>
      <p className="text-muted-foreground">指定された請求書は存在しないか、削除されています。</p>
      <Button asChild>
        <Link href="/invoices">請求書一覧に戻る</Link>
      </Button>
    </div>
  );
}
