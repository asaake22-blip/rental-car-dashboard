import Link from "next/link";
import { notFound } from "next/navigation";
import { vehicleService } from "@/lib/services/vehicle-service";
import { leaseContractService } from "@/lib/services/lease-contract-service";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface PageProps {
  params: Promise<{ id: string }>;
}

type LeaseLineWithContract = {
  id: string;
  startDate: Date;
  endDate: Date;
  monthlyAmount: number;
  contract: {
    id: string;
    contractNumber: string;
    lesseeName: string;
    status: string;
  };
};

export default async function VehicleLeaseContractsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const vehicle = await vehicleService.get(id);
  if (!vehicle) {
    notFound();
  }

  const v = vehicle as unknown as {
    id: string;
    vehicleCode: string;
  };

  // 車両に関連するリース契約明細を取得
  const leaseLines = (await leaseContractService.listByVehicle(
    id
  )) as unknown as LeaseLineWithContract[];

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "車両一覧", href: "/vehicles" },
          { label: v.vehicleCode, href: `/vehicles/${v.id}` },
          { label: "リース契約履歴" },
        ]}
      />

      <h1 className="text-2xl font-bold">
        {v.vehicleCode} のリース契約履歴
      </h1>

      {leaseLines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          関連するリース契約はありません
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">契約番号</TableHead>
                <TableHead className="whitespace-nowrap">
                  リース先名称
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  明細開始日
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  明細終了日
                </TableHead>
                <TableHead className="whitespace-nowrap">月額</TableHead>
                <TableHead className="whitespace-nowrap">
                  ステータス
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaseLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={`/lease-contracts/${line.contract.id}`}
                      className="text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
                    >
                      {line.contract.contractNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {line.contract.lesseeName}
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
                  <TableCell className="whitespace-nowrap">
                    <Badge
                      variant={
                        statusVariant[line.contract.status] ?? "outline"
                      }
                    >
                      {statusLabel[line.contract.status] ??
                        line.contract.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
