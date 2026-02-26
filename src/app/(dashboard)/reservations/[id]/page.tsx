import Link from "next/link";
import { notFound } from "next/navigation";
import { reservationService } from "@/lib/services/reservation-service";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { DetailSection } from "@/components/record-detail/detail-section";
import { FieldDisplay } from "@/components/record-detail/field-display";
import { FieldLinkDisplay } from "@/components/record-detail/field-link-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReservationDetailActions } from "./reservation-detail-actions";
import { ReservationStatusProgress } from "./reservation-status-progress";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusLabels: Record<string, string> = {
  RESERVED: "予約",
  CONFIRMED: "配車済",
  DEPARTED: "出発中",
  RETURNED: "帰着",
  SETTLED: "精算済",
  CANCELLED: "キャンセル",
  NO_SHOW: "ノーショー",
};

const approvalStatusLabels: Record<string, string> = {
  APPROVED: "承認済",
  PENDING: "承認待ち",
  REJECTED: "却下",
};

const approvalStatusColors: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const entityTypeLabels: Record<number, string> = {
  1: "個人",
  2: "法人",
};

const invoiceStatusLabels: Record<string, string> = {
  DRAFT: "下書き",
  ISSUED: "発行済",
  PAID: "入金済",
  OVERDUE: "延滞",
  CANCELLED: "取消",
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("ja-JP");
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  return `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
}

export default async function ReservationDetailPage({ params }: PageProps) {
  const { id } = await params;

  const reservation = await reservationService.get(id);

  if (!reservation) {
    notFound();
  }

  const r = reservation as any;

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "予約一覧", href: "/reservations" },
          { label: r.reservationCode },
        ]}
      />

      <ReservationDetailActions
        id={r.id}
        reservationCode={r.reservationCode}
        status={r.status}
        vehicleId={r.vehicleId}
        vehicleClassId={r.vehicleClassId}
        vehicleMileage={r.vehicle?.mileage ?? 0}
        pickupDate={formatDateTime(r.pickupDate)}
        returnDate={formatDateTime(r.returnDate)}
        customerName={r.customerName}
        customerPhone={r.customerPhone}
        customerEmail={r.customerEmail}
        vehicleCode={r.vehicle?.vehicleCode ?? ""}
        vehicleName={r.vehicle ? `${r.vehicle.maker} ${r.vehicle.modelName}` : ""}
        plateNumber={r.vehicle?.plateNumber ?? null}
        vehicleClassName={r.vehicleClass?.className ?? ""}
        pickupOfficeName={r.pickupOffice?.officeName ?? ""}
        returnOfficeName={r.returnOffice?.officeName ?? ""}
        estimatedAmount={r.estimatedAmount}
        actualPickupDate={r.actualPickupDate ? formatDateTime(r.actualPickupDate) : ""}
        departureOdometer={r.departureOdometer ?? 0}
        note={r.note}
      />

      {/* ステータス進行バー */}
      <ReservationStatusProgress status={r.status} />

      {/* 基本情報 */}
      <DetailSection title="基本情報">
        <FieldDisplay label="予約番号" value={r.reservationCode} />
        <FieldDisplay label="ステータス" value={statusLabels[r.status] ?? r.status} />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">承認ステータス</p>
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${approvalStatusColors[r.approvalStatus] ?? ""}`}
            >
              {approvalStatusLabels[r.approvalStatus] ?? r.approvalStatus}
            </span>
          </div>
        </div>
        <FieldDisplay label="顧客名" value={r.customerName} />
        <FieldDisplay label="顧客名（カナ）" value={r.customerNameKana} />
        <FieldDisplay label="電話番号" value={r.customerPhone} />
        <FieldDisplay label="メールアドレス" value={r.customerEmail} />
        <FieldDisplay label="顧客コード" value={r.customerCode} />
        <FieldDisplay label="個人/法人区分" value={r.entityType != null ? entityTypeLabels[r.entityType] ?? String(r.entityType) : null} />
        <FieldDisplay label="法人コード" value={r.companyCode} />
        <FieldDisplay label="販売チャネル" value={r.channel} />
        <FieldDisplay label="出発予定日時" value={formatDateTime(r.pickupDate)} />
        <FieldDisplay label="帰着予定日時" value={formatDateTime(r.returnDate)} />
        <FieldLinkDisplay
          label="出発営業所"
          value={r.pickupOffice?.officeName}
          href={r.pickupOfficeId ? `/offices/${r.pickupOfficeId}` : null}
        />
        <FieldLinkDisplay
          label="帰着営業所"
          value={r.returnOffice?.officeName}
          href={r.returnOfficeId ? `/offices/${r.returnOfficeId}` : null}
        />
        <FieldLinkDisplay
          label="車両クラス"
          value={r.vehicleClass?.className}
          href={r.vehicleClassId ? `/vehicle-classes/${r.vehicleClassId}` : null}
        />
      </DetailSection>

      {/* 車両情報（割当がある場合） */}
      {r.vehicle && (
        <DetailSection title="車両情報">
          <FieldLinkDisplay
            label="車両コード"
            value={r.vehicle.vehicleCode}
            href={`/vehicles/${r.vehicle.id}`}
          />
          <FieldDisplay
            label="車種"
            value={r.vehicle.modelName ? `${r.vehicle.maker} ${r.vehicle.modelName}` : null}
          />
          <FieldDisplay
            label="ナンバープレート"
            value={r.vehicle.plateNumber ?? "未登録"}
          />
        </DetailSection>
      )}

      {/* 金額情報 */}
      <DetailSection title="金額情報">
        <FieldDisplay label="見積金額" value={formatAmount(r.estimatedAmount)} />
        <FieldDisplay label="精算金額" value={formatAmount(r.actualAmount)} />
        <FieldDisplay label="消費税額" value={formatAmount(r.taxAmount)} />
        <FieldDisplay label="精算日時" value={formatDateTime(r.settledAt)} />
        <FieldDisplay label="売上計上日" value={formatDate(r.revenueDate)} />
      </DetailSection>

      {/* 走行・帰着情報（出発済以降） */}
      {(r.status === "DEPARTED" || r.status === "RETURNED" || r.status === "SETTLED") && (
        <DetailSection title="走行情報">
          <FieldDisplay label="実出発日時" value={formatDateTime(r.actualPickupDate)} />
          <FieldDisplay label="実帰着日時" value={formatDateTime(r.actualReturnDate)} />
          <FieldDisplay
            label="出発時走行距離"
            value={r.departureOdometer != null ? `${r.departureOdometer.toLocaleString("ja-JP")} km` : null}
          />
          <FieldDisplay
            label="帰着時走行距離"
            value={r.returnOdometer != null ? `${r.returnOdometer.toLocaleString("ja-JP")} km` : null}
          />
          <FieldDisplay label="帰着時燃料レベル" value={r.fuelLevelAtReturn} />
        </DetailSection>
      )}

      {/* オプション一覧（Phase 9D で実装） */}
      <DetailSection title="オプション" columns={1}>
        <p className="text-sm text-muted-foreground">オプションはまだ登録されていません。</p>
      </DetailSection>

      {/* 請求書セクション */}
      {r.invoices && r.invoices.length > 0 && (
        <DetailSection title="請求書" columns={1}>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>請求書番号</TableHead>
                  <TableHead>発行日</TableHead>
                  <TableHead>支払期日</TableHead>
                  <TableHead className="text-right">税込金額</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(inv.issueDate)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-right">{formatAmount(inv.totalAmount)}</TableCell>
                    <TableCell>{invoiceStatusLabels[inv.status] ?? inv.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DetailSection>
      )}

      {/* 備考 */}
      {r.note && (
        <DetailSection title="備考" columns={1}>
          <p className="text-base whitespace-pre-wrap">{r.note}</p>
        </DetailSection>
      )}

      {/* 管理情報 */}
      <DetailSection title="管理情報">
        <FieldDisplay label="作成日時" value={formatDateTime(r.createdAt)} />
        <FieldDisplay label="更新日時" value={formatDateTime(r.updatedAt)} />
      </DetailSection>
    </div>
  );
}
