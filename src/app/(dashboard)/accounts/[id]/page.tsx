import { notFound } from "next/navigation";
import { accountService } from "@/lib/services/account-service";
import { vehicleClassService } from "@/lib/services/vehicle-class-service";
import { officeService } from "@/lib/services/office-service";
import { reservationService } from "@/lib/services/reservation-service";
import { AccountDetailClient } from "./account-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: PageProps) {
  const { id } = await params;

  // 取引先データとマスタデータを並列取得
  const [account, accountResult, vcResult, officeResult, reservationResult] =
    await Promise.all([
      accountService.get(id),
      accountService.list({ orderBy: { accountName: "asc" }, take: 500 }),
      vehicleClassService.list({ orderBy: { sortOrder: "asc" }, take: 100 }),
      officeService.list({ orderBy: { officeName: "asc" }, take: 100 }),
      reservationService.list({
        where: { status: "SETTLED", entityType: 2 },
        orderBy: { reservationCode: "desc" },
        take: 100,
      }),
    ]);

  if (!account) {
    notFound();
  }

  const acc = account as any;

  // Date オブジェクトを文字列に変換して Client Component に渡す
  const serializedAccount = {
    id: acc.id,
    accountCode: acc.accountCode,
    accountName: acc.accountName,
    accountNameKana: acc.accountNameKana,
    accountType: acc.accountType,
    closingDay: acc.closingDay,
    paymentMonthOffset: acc.paymentMonthOffset,
    paymentDay: acc.paymentDay,
    paymentTermsLabel: acc.paymentTermsLabel,
    zipCode: acc.zipCode,
    address: acc.address,
    phone: acc.phone,
    email: acc.email,
    mfPartnerId: acc.mfPartnerId,
    mfPartnerCode: acc.mfPartnerCode,
    legacyCompanyCode: acc.legacyCompanyCode,
    createdAt: acc.createdAt instanceof Date ? acc.createdAt.toISOString() : acc.createdAt,
    updatedAt: acc.updatedAt instanceof Date ? acc.updatedAt.toISOString() : acc.updatedAt,
    quotations: (acc.quotations ?? []).map((q: any) => ({
      id: q.id,
      quotationCode: q.quotationCode,
      customerName: q.customerName,
      status: q.status,
      totalAmount: q.totalAmount,
    })),
    invoices: (acc.invoices ?? []).map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      status: inv.status,
      totalAmount: inv.totalAmount,
    })),
    reservations: (acc.reservations ?? []).map((r: any) => ({
      id: r.id,
      reservationCode: r.reservationCode,
      customerName: r.customerName,
      status: r.status,
    })),
  };

  const masterData = {
    accounts: accountResult.data.map((a: any) => ({
      id: a.id,
      accountName: a.accountName,
    })),
    vehicleClasses: vcResult.data.map((vc: any) => ({
      id: vc.id,
      className: vc.className,
    })),
    offices: officeResult.data.map((o: any) => ({
      id: o.id,
      officeName: o.officeName,
    })),
    settledReservations: reservationResult.data.map((r: any) => ({
      id: r.id,
      reservationCode: r.reservationCode,
      customerName: r.customerName,
    })),
  };

  return <AccountDetailClient account={serializedAccount} masterData={masterData} />;
}
