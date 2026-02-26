import Link from "next/link";
import { parkingService } from "@/lib/services/parking-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParkingHeader } from "./parking-header";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ParkingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const officeId = typeof sp.officeId === "string" ? sp.officeId : undefined;

  const lots = await parkingService.listLots(officeId);

  const lotRows = lots.map((lot) => {
    const l = lot as unknown as {
      id: string;
      name: string;
      canvasWidth: number;
      canvasHeight: number;
      office: { officeName: string };
      _count: { spots: number };
    };
    return {
      id: l.id,
      name: l.name,
      officeName: l.office.officeName,
      canvasWidth: l.canvasWidth,
      canvasHeight: l.canvasHeight,
      spotCount: l._count.spots,
    };
  });

  return (
    <div className="space-y-6">
      <ParkingHeader />

      {lotRows.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          駐車場が登録されていません。「新規登録」から追加してください。
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lotRows.map((lot) => (
            <Link key={lot.id} href={`/parking/${lot.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {lot.name}
                    <Badge variant="outline">{lot.spotCount} 区画</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{lot.officeName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lot.canvasWidth} x {lot.canvasHeight}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
