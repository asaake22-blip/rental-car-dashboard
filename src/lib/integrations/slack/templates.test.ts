import { describe, it, expect, vi } from "vitest";

vi.mock("@/generated/prisma/client", () => ({}));

import {
  reservationApprovedMessage,
  reservationRejectedMessage,
  invoiceIssuedMessage,
  invoicePaidMessage,
} from "./templates";
import { sampleReservation, sampleInvoice } from "@/__tests__/helpers/fixtures";

describe("reservationApprovedMessage", () => {
  it("text に予約コードを含む", () => {
    const msg = reservationApprovedMessage(sampleReservation as any);
    expect(msg.text).toContain("RS-00001");
  });

  it("blocks に header と section を含む", () => {
    const msg = reservationApprovedMessage(sampleReservation as any);
    expect(msg.blocks).toHaveLength(2);
    expect(msg.blocks![0].type).toBe("header");
    expect(msg.blocks![1].type).toBe("section");
  });

  it("section に顧客名と出発日を含む", () => {
    const msg = reservationApprovedMessage(sampleReservation as any);
    const sectionText = msg.blocks![1].text!.text;
    expect(sectionText).toContain(sampleReservation.customerName);
    expect(sectionText).toContain("2026-03-01");
  });
});

describe("reservationRejectedMessage", () => {
  it("text に '却下' を含む", () => {
    const msg = reservationRejectedMessage(sampleReservation as any);
    expect(msg.text).toContain("却下");
  });

  it("approvalComment あり時は却下理由を含む", () => {
    const reservation = { ...sampleReservation, approvalComment: "不備あり" };
    const msg = reservationRejectedMessage(reservation as any);
    const sectionText = msg.blocks![1].text!.text;
    expect(sectionText).toContain("不備あり");
  });

  it("approvalComment なし時は却下理由行を省略する", () => {
    const reservation = { ...sampleReservation, approvalComment: null };
    const msg = reservationRejectedMessage(reservation as any);
    const sectionText = msg.blocks![1].text!.text;
    expect(sectionText).not.toContain("却下理由");
  });
});

describe("invoiceIssuedMessage", () => {
  it("text に請求書番号を含む", () => {
    const msg = invoiceIssuedMessage(sampleInvoice as any);
    expect(msg.text).toContain("IV-00001");
  });

  it("section に請求金額と支払期日を含む", () => {
    const msg = invoiceIssuedMessage(sampleInvoice as any);
    const sectionText = msg.blocks![1].text!.text;
    expect(sectionText).toContain("16,500");
    expect(sectionText).toContain("2026-03-31");
  });
});

describe("invoicePaidMessage", () => {
  it("text に '入金' を含む", () => {
    const msg = invoicePaidMessage(sampleInvoice as any);
    expect(msg.text).toContain("入金");
  });

  it("paidAt あり時は入金日を含む", () => {
    const invoice = { ...sampleInvoice, paidAt: new Date("2026-03-20") };
    const msg = invoicePaidMessage(invoice as any);
    const sectionText = msg.blocks![1].text!.text;
    expect(sectionText).toContain("2026-03-20");
  });
});
