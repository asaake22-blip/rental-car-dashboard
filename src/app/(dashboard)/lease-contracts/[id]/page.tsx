import Link from "next/link";
import { notFound } from "next/navigation";
import { leaseContractService } from "@/lib/services/lease-contract-service";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { DetailSection } from "@/components/record-detail/detail-section";
import { FieldDisplay } from "@/components/record-detail/field-display";
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
import { ContractDetailActions } from "./contract-detail-actions";
import { LineActions } from "./line-actions";

const statusLabel: Record<string, string> = {
  ACTIVE: "有効",
  EXPIRED: "満了",
  TERMINATED: "解約",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  EXPIRED: "outline",
  TERMINATED: "secondary",
};

const lesseeTypeLabel: Record<string, string> = {
  INDIVIDUAL: "個人",
  CORPORATE: "法人",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

type ContractLine = {
  id: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  monthlyAmount: number;
  note: string | null;
  vehicle: {
    id: string;
    vehicleCode: string;
    plateNumber: string | null;
    maker: string;
    modelName: string;
    office?: { officeName: string } | null;
  };
};

type ContractDetail = {
  id: string;
  contractNumber: string;
  externalId: string | null;
  lesseeType: string;
  lesseeCompanyCode: string | null;
  lesseeName: string;
  startDate: Date;
  endDate: Date;
  status: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines: ContractLine[];
};

export default async function LeaseContractDetailPage({ params }: PageProps) {
  const { id } = await params;

  const raw = await leaseContractService.get(id);
  if (!raw) {
    notFound();
  }

  const contract = raw as unknown as ContractDetail;

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "リース契約一覧", href: "/lease-contracts" },
          { label: contract.contractNumber },
        ]}
      />

      <ContractDetailActions
        id={contract.id}
        contractNumber={contract.contractNumber}
        status={contract.status}
        initialData={{
          lesseeType: contract.lesseeType,
          lesseeName: contract.lesseeName,
          lesseeCompanyCode: contract.lesseeCompanyCode,
          externalId: contract.externalId,
          startDate: contract.startDate.toISOString().split("T")[0],
          endDate: contract.endDate.toISOString().split("T")[0],
          note: contract.note,
        }}
      />

      <DetailSection title="契約情報">
        <FieldDisplay label="契約番号" value={contract.contractNumber} />
        <FieldDisplay label="外部ID" value={contract.externalId} />
        <FieldDisplay
          label="区分"
          value={lesseeTypeLabel[contract.lesseeType] ?? contract.lesseeType}
        />
        <FieldDisplay label="リース先名称" value={contract.lesseeName} />
        <FieldDisplay label="会社コード" value={contract.lesseeCompanyCode} />
        <FieldDisplay
          label="契約開始日"
          value={contract.startDate.toLocaleDateString("ja-JP")}
        />
        <FieldDisplay
          label="契約終了日"
          value={contract.endDate.toLocaleDateString("ja-JP")}
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            ステータス
          </p>
          <div>
            <Badge variant={statusVariant[contract.status] ?? "outline"}>
              {statusLabel[contract.status] ?? contract.status}
            </Badge>
          </div>
        </div>
        <FieldDisplay label="備考" value={contract.note} />
      </DetailSection>

      {/* 契約明細（車両）テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            契約明細（車両）
            <span className="text-sm font-normal text-muted-foreground">
              ({contract.lines.length}件)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contract.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              契約明細はありません
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      車両
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      メーカー / 車種
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      明細開始日
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      明細終了日
                    </TableHead>
                    <TableHead className="whitespace-nowrap">月額</TableHead>
                    {contract.status === "ACTIVE" && (
                      <TableHead className="whitespace-nowrap w-[80px]" />
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="whitespace-nowrap">
                        <Link
                          href={`/vehicles/${line.vehicle.id}`}
                          className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
                        >
                          {line.vehicle.vehicleCode}
                        </Link>
                        {line.vehicle.plateNumber && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({line.vehicle.plateNumber})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {line.vehicle.maker} / {line.vehicle.modelName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(line.startDate).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(line.endDate).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {line.monthlyAmount.toLocaleString("ja-JP")}円
                      </TableCell>
                      {contract.status === "ACTIVE" && (
                        <TableCell className="whitespace-nowrap">
                          <LineActions
                            contractId={contract.id}
                            line={{
                              id: line.id,
                              startDate: new Date(line.startDate).toISOString().split("T")[0],
                              endDate: new Date(line.endDate).toISOString().split("T")[0],
                              monthlyAmount: line.monthlyAmount,
                              note: line.note,
                              vehicleCode: line.vehicle.vehicleCode,
                            }}
                          />
                        </TableCell>
                      )}
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
          value={contract.createdAt.toLocaleString("ja-JP")}
        />
        <FieldDisplay
          label="更新日時"
          value={contract.updatedAt.toLocaleString("ja-JP")}
        />
      </DetailSection>
    </div>
  );
}
