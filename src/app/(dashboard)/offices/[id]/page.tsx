import Link from "next/link";
import { notFound } from "next/navigation";
import { officeService } from "@/lib/services/office-service";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { DetailSection } from "@/components/record-detail/detail-section";
import { FieldDisplay } from "@/components/record-detail/field-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

const vehicleStatusLabel: Record<string, string> = {
  IN_STOCK: "在庫",
  LEASED: "リース中",
  MAINTENANCE: "整備中",
  RETIRED: "廃車",
};

const vehicleStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  IN_STOCK: "default",
  LEASED: "secondary",
  MAINTENANCE: "outline",
  RETIRED: "destructive",
};

export default async function OfficeDetailPage({ params }: PageProps) {
  const { id } = await params;

  const office = await officeService.get(id);
  if (!office) {
    notFound();
  }

  const o = office as unknown as {
    id: string;
    officeName: string;
    area: string | null;
    vehicles: Array<{
      id: string;
      vehicleCode: string;
      plateNumber: string | null;
      maker: string;
      modelName: string;
      status: string;
    }>;
    parkingLots: Array<{
      id: string;
      name: string;
      _count?: { spots: number };
    }>;
    createdAt: Date;
    updatedAt: Date;
  };

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "営業所マスタ", href: "/offices" },
          { label: o.officeName },
        ]}
      />

      <DetailSection title="基本情報">
        <FieldDisplay label="営業所名" value={o.officeName} />
        <FieldDisplay label="エリア" value={o.area ?? "-"} />
      </DetailSection>

      <DetailSection title={`車両 (${o.vehicles.length} 台)`}>
        {o.vehicles.length === 0 ? (
          <p className="col-span-full text-sm text-muted-foreground">
            車両が登録されていません。
          </p>
        ) : (
          <div className="col-span-full grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {o.vehicles.map((v) => (
              <Link key={v.id} href={`/vehicles/${v.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      {v.vehicleCode}
                      <Badge variant={vehicleStatusVariant[v.status] ?? "outline"}>
                        {vehicleStatusLabel[v.status] ?? v.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {v.maker} {v.modelName}
                    </p>
                    {v.plateNumber && (
                      <p className="text-xs text-muted-foreground mt-0.5">{v.plateNumber}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title={`駐車場 (${o.parkingLots.length} 箇所)`}>
        {o.parkingLots.length === 0 ? (
          <p className="col-span-full text-sm text-muted-foreground">
            駐車場が登録されていません。
          </p>
        ) : (
          <div className="col-span-full flex flex-wrap gap-3">
            {o.parkingLots.map((lot) => (
              <Link
                key={lot.id}
                href={`/parking/${lot.id}`}
                className="text-sm text-link hover:text-link-hover active:text-link-active hover:underline"
              >
                {lot.name} →
              </Link>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="管理情報">
        <FieldDisplay label="作成日時" value={o.createdAt.toLocaleString("ja-JP")} />
        <FieldDisplay label="更新日時" value={o.updatedAt.toLocaleString("ja-JP")} />
      </DetailSection>
    </div>
  );
}
