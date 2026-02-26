import Link from "next/link";
import { notFound } from "next/navigation";
import { terminalService } from "@/lib/services/terminal-service";
import { paymentService } from "@/lib/services/payment-service";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { DetailSection } from "@/components/record-detail/detail-section";
import { FieldDisplay } from "@/components/record-detail/field-display";
import { FieldLinkDisplay } from "@/components/record-detail/field-link-display";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TerminalDetailActions } from "./terminal-detail-actions";

const typeLabel: Record<string, string> = {
  CREDIT_CARD: "クレジットカード",
  ELECTRONIC_MONEY: "電子マネー",
  QR_PAYMENT: "QR決済",
  MULTI: "マルチ決済",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "稼働中",
  INACTIVE: "停止中",
  MAINTENANCE: "メンテナンス中",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  MAINTENANCE: "outline",
};

const paymentCategoryLabel: Record<string, string> = {
  BANK_TRANSFER: "銀行振込",
  CASH: "現金",
  CREDIT_CARD: "クレジットカード",
  ELECTRONIC_MONEY: "電子マネー",
  QR_PAYMENT: "QR決済",
  CHECK: "小切手",
  OTHER: "その他",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

type TerminalDetail = {
  id: string;
  terminalCode: string;
  terminalName: string;
  terminalType: string;
  provider: string | null;
  modelName: string | null;
  serialNumber: string | null;
  officeId: string;
  office: { id: string; officeName: string };
  status: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { payments: number };
};

export default async function TerminalDetailPage({ params }: PageProps) {
  const { id } = await params;

  let raw;
  try {
    raw = await terminalService.get(id);
  } catch {
    notFound();
  }

  if (!raw) {
    notFound();
  }

  const terminal = raw as unknown as TerminalDetail;

  // この端末に紐づく入金を取得（最新20件）
  const { data: recentPayments } = await paymentService.list({
    where: { terminalId: terminal.id },
    orderBy: { paymentDate: "desc" },
    take: 20,
  });

  const payments = recentPayments as unknown as Array<{
    id: string;
    paymentNumber: string;
    paymentDate: Date;
    amount: number;
    paymentCategory: string;
    payerName: string;
    status: string;
  }>;

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "決済端末一覧", href: "/terminals" },
          { label: terminal.terminalCode },
        ]}
      />

      <TerminalDetailActions
        id={terminal.id}
        terminalCode={terminal.terminalCode}
        initialData={{
          terminalName: terminal.terminalName,
          terminalType: terminal.terminalType,
          provider: terminal.provider,
          modelName: terminal.modelName,
          serialNumber: terminal.serialNumber,
          officeId: terminal.officeId,
          officeName: terminal.office.officeName,
          status: terminal.status,
          paymentCount: terminal._count.payments,
          note: terminal.note,
        }}
      />

      <DetailSection title="端末情報">
        <FieldDisplay label="端末コード" value={terminal.terminalCode} />
        <FieldDisplay label="名称" value={terminal.terminalName} />
        <FieldDisplay
          label="種別"
          value={typeLabel[terminal.terminalType] ?? terminal.terminalType}
        />
        <FieldDisplay label="プロバイダ" value={terminal.provider} />
        <FieldDisplay label="機種名" value={terminal.modelName} />
        <FieldDisplay label="シリアル番号" value={terminal.serialNumber} />
        <FieldLinkDisplay
          label="営業所"
          value={terminal.office.officeName}
          href={`/offices/${terminal.office.id}`}
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            ステータス
          </p>
          <div>
            <Badge variant={statusVariant[terminal.status] ?? "outline"}>
              {statusLabel[terminal.status] ?? terminal.status}
            </Badge>
          </div>
        </div>
        <FieldDisplay label="メモ" value={terminal.note} />
      </DetailSection>

      {/* この端末で処理した入金一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            入金履歴
            <span className="text-sm font-normal text-muted-foreground">
              (全{terminal._count.payments}件{payments.length < terminal._count.payments ? `、直近${payments.length}件を表示` : ""})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              入金データはありません
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      入金番号
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      入金日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      金額
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      カテゴリ
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      入金元
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">
                        <Link
                          href={`/payments/${p.id}`}
                          className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
                        >
                          {p.paymentNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(p.paymentDate).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {`\u00a5${p.amount.toLocaleString("ja-JP")}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {paymentCategoryLabel[p.paymentCategory] ??
                          p.paymentCategory}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {p.payerName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailSection title="管理情報">
        <FieldDisplay
          label="作成日時"
          value={terminal.createdAt.toLocaleString("ja-JP")}
        />
        <FieldDisplay
          label="更新日時"
          value={terminal.updatedAt.toLocaleString("ja-JP")}
        />
      </DetailSection>
    </div>
  );
}
