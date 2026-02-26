/**
 * マネーフォワード連携イベントハンドラー
 *
 * 請求書発行イベントに反応して MF に請求書を自動作成し、
 * 連携結果を Invoice レコードに保存する。
 */

import { eventBus } from "@/lib/events/event-bus";
import { createMoneyForwardInvoice } from "@/lib/integrations/moneyforward/client";
import { prisma } from "@/lib/prisma";
import type { MFBillingItem } from "@/lib/integrations/moneyforward/types";

// invoice.issued → MF に請求書自動作成
eventBus.on("invoice.issued", async ({ invoice }) => {
  // InvoiceLine → MFBillingItem 変換
  const invoiceWithDetails = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: { lines: { orderBy: { sortOrder: "asc" } }, account: true },
  });

  const items: MFBillingItem[] = (invoiceWithDetails?.lines ?? []).map((line) => ({
    name: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    amount: line.amount,
    taxRate: line.taxRate,
    taxAmount: line.taxAmount,
  }));

  const result = await createMoneyForwardInvoice({
    customerName: invoice.customerName,
    customerCode: invoice.customerCode ?? undefined,
    companyCode: invoice.companyCode ?? undefined,
    partnerId: invoiceWithDetails?.account?.mfPartnerId ?? undefined,
    partnerCode: invoiceWithDetails?.account?.mfPartnerCode ?? undefined,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    amount: invoice.amount,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    items: items.length > 0 ? items : undefined,
    note: invoice.note ?? undefined,
  });

  if (result) {
    // MF 連携成功 → externalId/externalUrl を保存
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        externalStatus: result.externalStatus,
        syncedAt: new Date(),
      },
    });
  }
});
