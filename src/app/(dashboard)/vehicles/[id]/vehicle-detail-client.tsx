"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DetailSection } from "@/components/record-detail/detail-section";
import { FieldDisplay } from "@/components/record-detail/field-display";
import { FieldLinkDisplay } from "@/components/record-detail/field-link-display";
import { RelatedList } from "@/components/record-detail/related-list";
import { VehicleDetailActions } from "./vehicle-detail-actions";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

interface ReservationItem {
  id: string;
  reservationCode: string;
  pickupDate: string;
  customerName: string;
  actualAmount: number | null;
  approvalStatus: string;
}

interface LeaseLineItem {
  id: string;
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  contract: {
    id: string;
    contractNumber: string;
    lesseeName: string;
    status: string;
  };
}

interface InspectionItem {
  id: string;
  inspectionType: string;
  scheduledDate: string;
  isCompleted: boolean;
}

interface VehicleData {
  id: string;
  vehicleCode: string;
  plateNumber: string | null;
  vin: string | null;
  maker: string;
  modelName: string;
  year: number;
  color: string | null;
  mileage: number;
  status: string;
  officeId: string | null;
  office?: { officeName: string; area: string | null } | null;
  parkingSpot?: { name: string; parkingLot: { id: string; name: string } } | null;
  createdAt: string;
  updatedAt: string;
}

interface NextInspectionData {
  inspectionType: string;
  scheduledDate: string;
}

interface VehicleDetailClientProps {
  vehicle: VehicleData;
  reservations: ReservationItem[];
  reservationsCount: number;
  leaseLines: LeaseLineItem[];
  leaseLinesCount: number;
  inspections: InspectionItem[];
  nextInspection: NextInspectionData | null;
}

// ---------------------------------------------------------------------------
// ラベルマップ
// ---------------------------------------------------------------------------

const statusLabel: Record<string, string> = {
  IN_STOCK: "在庫",
  LEASED: "リース中",
  MAINTENANCE: "整備中",
  RETIRED: "廃車",
};

const inspectionTypeLabel: Record<string, string> = {
  REGULAR: "定期点検",
  LEGAL: "法令点検",
  SHAKEN: "車検",
  MAINTENANCE: "整備",
};

const approvalStatusLabel: Record<string, string> = {
  PENDING: "未承認",
  APPROVED: "承認済",
  REJECTED: "却下",
};

const approvalStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};

const leaseStatusLabel: Record<string, string> = {
  ACTIVE: "有効",
  EXPIRED: "満了",
  TERMINATED: "解約",
};

const leaseStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  EXPIRED: "outline",
  TERMINATED: "secondary",
};

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

export function VehicleDetailClient({
  vehicle: v,
  reservations,
  reservationsCount,
  leaseLines,
  leaseLinesCount,
  inspections,
  nextInspection,
}: VehicleDetailClientProps) {
  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "車両一覧", href: "/vehicles" },
          { label: v.vehicleCode },
        ]}
      />

      <VehicleDetailActions id={v.id} vehicleCode={v.vehicleCode} />

      <DetailSection title="基本情報">
        <FieldDisplay label="車両コード" value={v.vehicleCode} />
        <FieldDisplay label="ナンバープレート" value={v.plateNumber ?? "未登録"} />
        <FieldDisplay label="車台番号" value={v.vin} />
        <FieldDisplay label="メーカー" value={v.maker} />
        <FieldDisplay label="車種名" value={v.modelName} />
        <FieldDisplay label="年式" value={v.year} type="number" />
        <FieldDisplay label="色" value={v.color} />
        <FieldDisplay label="走行距離" value={v.mileage ? `${v.mileage.toLocaleString("ja-JP")} km` : "0 km"} />
        <FieldDisplay label="ステータス" value={statusLabel[v.status] ?? v.status} />
      </DetailSection>

      <DetailSection title="所属情報">
        <FieldLinkDisplay
          label="営業所"
          value={v.office?.officeName}
          href={v.office ? `/offices/${v.officeId}` : null}
        />
        <FieldDisplay label="エリア" value={v.office?.area} />
      </DetailSection>

      {v.parkingSpot && (
        <DetailSection title="駐車位置">
          <FieldLinkDisplay
            label="駐車場"
            value={v.parkingSpot.parkingLot.name}
            href={`/parking/${v.parkingSpot.parkingLot.id}`}
          />
          <FieldDisplay label="区画" value={v.parkingSpot.name} />
        </DetailSection>
      )}

      {nextInspection && (
        <DetailSection title="次回点検予定">
          <FieldDisplay
            label="点検種別"
            value={inspectionTypeLabel[nextInspection.inspectionType] ?? nextInspection.inspectionType}
          />
          <FieldDisplay
            label="予定日"
            value={new Date(nextInspection.scheduledDate).toLocaleDateString("ja-JP")}
          />
        </DetailSection>
      )}

      <RelatedList
        title="予約"
        items={reservations}
        totalCount={reservationsCount}
        viewAllHref={`/reservations?vehicleId=${v.id}`}
        emptyMessage="関連する予約はありません"
        columns={[
          {
            header: "予約コード",
            accessor: (r) => (
              <Link href={`/reservations/${r.id}`} className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium">
                {r.reservationCode}
              </Link>
            ),
          },
          {
            header: "出発日",
            accessor: (r) => new Date(r.pickupDate).toLocaleDateString("ja-JP"),
          },
          { header: "顧客名", accessor: (r) => r.customerName },
          {
            header: "精算金額",
            accessor: (r) => r.actualAmount ? `${r.actualAmount.toLocaleString("ja-JP")}円` : "-",
          },
          {
            header: "ステータス",
            accessor: (r) => (
              <Badge variant={approvalStatusVariant[r.approvalStatus] ?? "outline"}>
                {approvalStatusLabel[r.approvalStatus] ?? r.approvalStatus}
              </Badge>
            ),
          },
        ]}
      />

      <RelatedList
        title="リース契約"
        items={leaseLines}
        totalCount={leaseLinesCount}
        viewAllHref={`/vehicles/${v.id}/lease-contracts`}
        emptyMessage="関連するリース契約はありません"
        columns={[
          {
            header: "契約番号",
            accessor: (l) => (
              <Link href={`/lease-contracts/${l.contract.id}`} className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium">
                {l.contract.contractNumber}
              </Link>
            ),
          },
          { header: "リース先", accessor: (l) => l.contract.lesseeName },
          {
            header: "開始日",
            accessor: (l) => new Date(l.startDate).toLocaleDateString("ja-JP"),
          },
          {
            header: "終了日",
            accessor: (l) => new Date(l.endDate).toLocaleDateString("ja-JP"),
          },
          {
            header: "月額",
            accessor: (l) => `${l.monthlyAmount.toLocaleString("ja-JP")}円`,
          },
          {
            header: "ステータス",
            accessor: (l) => (
              <Badge variant={leaseStatusVariant[l.contract.status] ?? "outline"}>
                {leaseStatusLabel[l.contract.status] ?? l.contract.status}
              </Badge>
            ),
          },
        ]}
      />

      <RelatedList
        title="点検・整備"
        items={inspections}
        totalCount={inspections.length}
        viewAllHref={`/vehicles/${v.id}/inspections`}
        emptyMessage="関連する点検はありません"
        columns={[
          {
            header: "種別",
            accessor: (i) => inspectionTypeLabel[i.inspectionType] ?? i.inspectionType,
          },
          {
            header: "予定日",
            accessor: (i) => new Date(i.scheduledDate).toLocaleDateString("ja-JP"),
          },
          {
            header: "状態",
            accessor: (i) => i.isCompleted ? "完了" : "未実施",
          },
        ]}
      />

      <DetailSection title="管理情報">
        <FieldDisplay label="作成日時" value={new Date(v.createdAt).toLocaleString("ja-JP")} />
        <FieldDisplay label="更新日時" value={new Date(v.updatedAt).toLocaleString("ja-JP")} />
      </DetailSection>
    </div>
  );
}
