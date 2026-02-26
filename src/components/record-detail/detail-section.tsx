/**
 * セクションカードコンポーネント
 *
 * レコード詳細ページでフィールドをグループ化するカード。
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
  columns?: 1 | 2;
}

export function DetailSection({ title, children, columns = 2 }: DetailSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={columns === 2 ? "grid gap-6 sm:grid-cols-2" : "grid gap-6"}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
