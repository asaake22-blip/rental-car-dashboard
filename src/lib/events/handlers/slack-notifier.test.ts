import { describe, it, expect, vi, beforeEach } from "vitest";
import { sampleReservation, sampleInvoice } from "@/__tests__/helpers/fixtures";

// sendSlackMessage をモック
const mockSendSlackMessage = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/integrations/slack/client", () => ({
  sendSlackMessage: mockSendSlackMessage,
}));
vi.mock("@/generated/prisma/client", () => ({}));

// EventBus クラスを直接 import して新規インスタンスでテスト
import { EventBus } from "../event-bus";
import {
  reservationApprovedMessage,
  reservationRejectedMessage,
  invoiceIssuedMessage,
  invoicePaidMessage,
} from "@/lib/integrations/slack/templates";

/**
 * slack-notifier.ts のハンドラーロジックを
 * 独立した EventBus インスタンスで再現してテストする。
 *
 * シングルトン eventBus を使わないことで、他テストとの干渉を防ぐ。
 */
function registerSlackHandlers(bus: EventBus) {
  bus.on("reservation.approved", async ({ reservation }) => {
    await mockSendSlackMessage(reservationApprovedMessage(reservation));
  });
  bus.on("reservation.rejected", async ({ reservation }) => {
    await mockSendSlackMessage(reservationRejectedMessage(reservation));
  });
  bus.on("invoice.issued", async ({ invoice }) => {
    await mockSendSlackMessage(invoiceIssuedMessage(invoice));
  });
  bus.on("invoice.paid", async ({ invoice }) => {
    await mockSendSlackMessage(invoicePaidMessage(invoice));
  });
}

describe("slack-notifier ハンドラー", () => {
  let bus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    bus = new EventBus();
    registerSlackHandlers(bus);
  });

  describe("予約イベント", () => {
    it("reservation.approved → sendSlackMessage が呼ばれる", async () => {
      const approved = { ...sampleReservation, approvalStatus: "APPROVED" as const };
      await bus.emit("reservation.approved", { reservation: approved as any, userId: "u1" });

      expect(mockSendSlackMessage).toHaveBeenCalledTimes(1);
      const msg = mockSendSlackMessage.mock.calls[0][0];
      expect(msg.text).toContain("承認");
      expect(msg.text).toContain(sampleReservation.reservationCode);
    });

    it("reservation.rejected → sendSlackMessage が呼ばれる", async () => {
      const rejected = { ...sampleReservation, approvalStatus: "REJECTED" as const, approvalComment: "差し戻し" };
      await bus.emit("reservation.rejected", { reservation: rejected as any, userId: "u1" });

      expect(mockSendSlackMessage).toHaveBeenCalledTimes(1);
      const msg = mockSendSlackMessage.mock.calls[0][0];
      expect(msg.text).toContain("却下");
    });
  });

  describe("請求書イベント", () => {
    it("invoice.issued → sendSlackMessage が呼ばれる", async () => {
      const issued = { ...sampleInvoice, status: "ISSUED" as const };
      await bus.emit("invoice.issued", { invoice: issued as any, userId: "u1" });

      expect(mockSendSlackMessage).toHaveBeenCalledTimes(1);
      const msg = mockSendSlackMessage.mock.calls[0][0];
      expect(msg.text).toContain(sampleInvoice.invoiceNumber);
      expect(msg.text).toContain("発行");
    });

    it("invoice.paid → sendSlackMessage が呼ばれる", async () => {
      const paid = { ...sampleInvoice, status: "PAID" as const, paidAt: new Date("2026-03-15") };
      await bus.emit("invoice.paid", { invoice: paid as any, userId: "u1" });

      expect(mockSendSlackMessage).toHaveBeenCalledTimes(1);
      const msg = mockSendSlackMessage.mock.calls[0][0];
      expect(msg.text).toContain("入金");
    });
  });

  describe("メッセージ内容", () => {
    it("reservation.approved のメッセージに予約コードと顧客名が含まれる", async () => {
      const approved = { ...sampleReservation, approvalStatus: "APPROVED" as const };
      await bus.emit("reservation.approved", { reservation: approved as any, userId: "u1" });

      const msg = mockSendSlackMessage.mock.calls[0][0];
      expect(msg.blocks).toBeDefined();
      const sectionText = msg.blocks[1].text.text;
      expect(sectionText).toContain(sampleReservation.reservationCode);
      expect(sectionText).toContain(sampleReservation.customerName);
    });

    it("invoice.issued のメッセージに請求金額が含まれる", async () => {
      const issued = { ...sampleInvoice, status: "ISSUED" as const };
      await bus.emit("invoice.issued", { invoice: issued as any, userId: "u1" });

      const msg = mockSendSlackMessage.mock.calls[0][0];
      const sectionText = msg.blocks[1].text.text;
      expect(sectionText).toContain("16,500");
    });

    it("reservation.rejected の却下理由がメッセージに含まれる", async () => {
      const rejected = { ...sampleReservation, approvalComment: "不備あり" };
      await bus.emit("reservation.rejected", { reservation: rejected as any, userId: "u1" });

      const msg = mockSendSlackMessage.mock.calls[0][0];
      const sectionText = msg.blocks[1].text.text;
      expect(sectionText).toContain("不備あり");
    });
  });
});
