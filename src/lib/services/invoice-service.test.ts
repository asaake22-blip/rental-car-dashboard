/**
 * invoice-service のユニットテスト
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockPrisma,
  mockGetCurrentUser,
  mockHasRole,
  mockEventBus,
} from "@/__tests__/helpers/setup";
import {
  adminUser,
  sampleInvoice,
  sampleInvoiceLine,
  sampleReservation,
  validInvoiceInput,
} from "@/__tests__/helpers/fixtures";
import { ValidationError, NotFoundError, PermissionError } from "@/lib/errors";

vi.mock("@/generated/prisma/client", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
  hasRole: mockHasRole,
}));
vi.mock("@/lib/events/event-bus", () => ({ eventBus: mockEventBus }));
vi.mock("@/lib/events/handlers", () => ({}));

const { invoiceService } = await import("@/lib/services/invoice-service");

describe("invoiceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    mockHasRole.mockReturnValue(true);
  });

  // =================================================================
  // list
  // =================================================================
  describe("list", () => {
    it("一覧取得: data + total を返す", async () => {
      const invoices = [
        { ...sampleInvoice, reservation: sampleReservation, allocations: [] },
      ];
      mockPrisma.invoice.findMany.mockResolvedValue(invoices);
      mockPrisma.invoice.count.mockResolvedValue(1);

      const result = await invoiceService.list({});

      expect(result).toEqual({ data: invoices, total: 1 });
      expect(mockPrisma.invoice.findMany).toHaveBeenCalled();
      expect(mockPrisma.invoice.count).toHaveBeenCalled();
    });

    it("フィルタ・ページネーションパラメータを転送する", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      const where = { status: "ISSUED" as const };
      await invoiceService.list({ where, skip: 10, take: 20 });

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where, skip: 10, take: 20 }),
      );
      expect(mockPrisma.invoice.count).toHaveBeenCalledWith({ where });
    });
  });

  // =================================================================
  // get
  // =================================================================
  describe("get", () => {
    it("IDで取得（関連データ含む）", async () => {
      const invoiceWithRelations = {
        ...sampleInvoice,
        reservation: {
          ...sampleReservation,
          pickupOffice: { id: "office-001", officeName: "越谷" },
          vehicleClass: { id: "vc-1", className: "コンパクト" },
        },
        allocations: [],
      };
      mockPrisma.invoice.findUnique.mockResolvedValue(invoiceWithRelations);

      const result = await invoiceService.get("invoice-001");

      expect(result).toEqual(invoiceWithRelations);
      expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "invoice-001" } }),
      );
    });

    it("存在しない場合 null を返す", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      const result = await invoiceService.get("nonexistent");

      expect(result).toBeNull();
    });
  });

  // =================================================================
  // create
  // =================================================================
  describe("create", () => {
    it("IV-NNNNN 自動採番で作成 + reservation.revenueDate 更新", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        invoiceNumber: "IV-00005",
      });
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          invoice: {
            create: vi.fn().mockResolvedValue({
              ...sampleInvoice,
              invoiceNumber: "IV-00006",
            }),
          },
          reservation: {
            update: vi.fn().mockResolvedValue({
              ...sampleReservation,
              revenueDate: new Date("2026-03-31"),
            }),
          },
        };
        return fn(tx);
      });

      const result = await invoiceService.create(validInvoiceInput);

      expect(result.invoiceNumber).toBe("IV-00006");
      expect(mockEventBus.emit).toHaveBeenCalledWith("invoice.created", {
        invoice: expect.objectContaining({ invoiceNumber: "IV-00006" }),
        userId: adminUser.id,
      });
    });

    it("初回（既存なし）は IV-00001", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          invoice: {
            create: vi.fn().mockResolvedValue({
              ...sampleInvoice,
              invoiceNumber: "IV-00001",
            }),
          },
          reservation: {
            update: vi.fn().mockResolvedValue(sampleReservation),
          },
        };
        return fn(tx);
      });

      const result = await invoiceService.create(validInvoiceInput);

      expect(result.invoiceNumber).toBe("IV-00001");
    });

    it("権限なし → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(invoiceService.create(validInvoiceInput)).rejects.toThrow(
        PermissionError,
      );
    });

    it("バリデーション失敗（customerName 空）→ ValidationError", async () => {
      await expect(
        invoiceService.create({ ...validInvoiceInput, customerName: "" }),
      ).rejects.toThrow(ValidationError);
    });

    it("予約が存在しない → NotFoundError", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(null);

      await expect(
        invoiceService.create({
          ...validInvoiceInput,
          reservationId: "nonexistent",
        }),
      ).rejects.toThrow("指定された予約が見つかりません");
    });

    it("unique 違反 → ValidationError", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);

      (mockPrisma.$transaction as any).mockRejectedValue({
        code: "P2002",
        meta: { target: ["invoiceNumber"] },
      });

      await expect(invoiceService.create(validInvoiceInput)).rejects.toThrow(
        "請求書番号が重複しています",
      );
    });

    it("イベント invoice.created が emit される", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);

      const created = { ...sampleInvoice, invoiceNumber: "IV-00001" };

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          invoice: {
            create: vi.fn().mockResolvedValue(created),
          },
          reservation: {
            update: vi.fn().mockResolvedValue(sampleReservation),
          },
        };
        return fn(tx);
      });

      await invoiceService.create(validInvoiceInput);

      expect(mockEventBus.emit).toHaveBeenCalledWith("invoice.created", {
        invoice: created,
        userId: adminUser.id,
      });
    });
  });

  // =================================================================
  // update
  // =================================================================
  describe("update", () => {
    it("DRAFT ステータスの請求書を更新", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(sampleInvoice);
      const updated = { ...sampleInvoice, customerName: "更新法人" };

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          invoice: {
            update: vi.fn().mockResolvedValue(updated),
          },
          invoiceLine: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return fn(tx);
      });

      const result = await invoiceService.update("invoice-001", {
        customerName: "更新法人",
      });

      expect(result.customerName).toBe("更新法人");
      expect(mockEventBus.emit).toHaveBeenCalledWith("invoice.updated", {
        invoice: updated,
        userId: adminUser.id,
      });
    });

    it("ISSUED ステータスの請求書は更新不可", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "ISSUED",
      });

      await expect(
        invoiceService.update("invoice-001", validInvoiceInput),
      ).rejects.toThrow(ValidationError);
    });

    it("PAID ステータスの請求書は更新不可", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "PAID",
      });

      await expect(
        invoiceService.update("invoice-001", validInvoiceInput),
      ).rejects.toThrow(ValidationError);
    });

    it("請求書が見つからない → NotFoundError", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      await expect(
        invoiceService.update("nonexistent", validInvoiceInput),
      ).rejects.toThrow(NotFoundError);
    });

    it("権限なし → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(
        invoiceService.update("invoice-001", validInvoiceInput),
      ).rejects.toThrow(PermissionError);
    });
  });

  // =================================================================
  // issue
  // =================================================================
  describe("issue", () => {
    it("DRAFT → ISSUED", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(sampleInvoice);
      const issued = { ...sampleInvoice, status: "ISSUED" as const };
      mockPrisma.invoice.update.mockResolvedValue(issued);

      const result = await invoiceService.issue("invoice-001");

      expect(result.status).toBe("ISSUED");
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "ISSUED" },
        }),
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith("invoice.issued", {
        invoice: issued,
        userId: adminUser.id,
      });
    });

    it("ISSUED ステータスの請求書は発行不可", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "ISSUED",
      });

      await expect(invoiceService.issue("invoice-001")).rejects.toThrow(
        ValidationError,
      );
    });

    it("PAID ステータスの請求書は発行不可", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "PAID",
      });

      await expect(invoiceService.issue("invoice-001")).rejects.toThrow(
        ValidationError,
      );
    });

    it("請求書が見つからない → NotFoundError", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      await expect(invoiceService.issue("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("権限なし → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(invoiceService.issue("invoice-001")).rejects.toThrow(
        PermissionError,
      );
    });
  });

  // =================================================================
  // markPaid
  // =================================================================
  describe("markPaid", () => {
    it("ISSUED → PAID", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "ISSUED",
      });
      const paid = { ...sampleInvoice, status: "PAID" as const, paidAt: new Date() };
      mockPrisma.invoice.update.mockResolvedValue(paid);

      const result = await invoiceService.markPaid("invoice-001");

      expect(result.status).toBe("PAID");
      expect(mockEventBus.emit).toHaveBeenCalledWith("invoice.paid", {
        invoice: paid,
        userId: adminUser.id,
      });
    });

    it("OVERDUE → PAID", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "OVERDUE",
      });
      const paid = { ...sampleInvoice, status: "PAID" as const, paidAt: new Date() };
      mockPrisma.invoice.update.mockResolvedValue(paid);

      const result = await invoiceService.markPaid("invoice-001");

      expect(result.status).toBe("PAID");
    });

    it("カスタム paidAt 日付を指定", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "ISSUED",
      });
      const customDate = new Date("2026-04-01");
      const paid = { ...sampleInvoice, status: "PAID" as const, paidAt: customDate };
      mockPrisma.invoice.update.mockResolvedValue(paid);

      await invoiceService.markPaid("invoice-001", customDate);

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PAID",
            paidAt: customDate,
          }),
        }),
      );
    });

    it("DRAFT ステータスの請求書は入金確認不可", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "DRAFT",
      });

      await expect(invoiceService.markPaid("invoice-001")).rejects.toThrow(
        ValidationError,
      );
    });

    it("PAID ステータスの請求書は入金確認不可", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "PAID",
      });

      await expect(invoiceService.markPaid("invoice-001")).rejects.toThrow(
        ValidationError,
      );
    });

    it("請求書が見つからない → NotFoundError", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      await expect(invoiceService.markPaid("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("権限なし → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(invoiceService.markPaid("invoice-001")).rejects.toThrow(
        PermissionError,
      );
    });
  });

  // =================================================================
  // cancel
  // =================================================================
  describe("cancel", () => {
    it("DRAFT → CANCELLED", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(sampleInvoice);
      const cancelled = { ...sampleInvoice, status: "CANCELLED" as const };
      mockPrisma.invoice.update.mockResolvedValue(cancelled);

      const result = await invoiceService.cancel("invoice-001");

      expect(result.status).toBe("CANCELLED");
      expect(mockEventBus.emit).toHaveBeenCalledWith("invoice.cancelled", {
        invoice: cancelled,
        userId: adminUser.id,
      });
    });

    it("ISSUED → CANCELLED", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "ISSUED",
      });
      const cancelled = { ...sampleInvoice, status: "CANCELLED" as const };
      mockPrisma.invoice.update.mockResolvedValue(cancelled);

      const result = await invoiceService.cancel("invoice-001");

      expect(result.status).toBe("CANCELLED");
    });

    it("PAID ステータスの請求書は取消不可", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "PAID",
      });

      await expect(invoiceService.cancel("invoice-001")).rejects.toThrow(
        ValidationError,
      );
    });

    it("OVERDUE ステータスの請求書は取消不可", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "OVERDUE",
      });

      await expect(invoiceService.cancel("invoice-001")).rejects.toThrow(
        ValidationError,
      );
    });

    it("CANCELLED ステータスの請求書は取消不可", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "CANCELLED",
      });

      await expect(invoiceService.cancel("invoice-001")).rejects.toThrow(
        ValidationError,
      );
    });

    it("請求書が見つからない → NotFoundError", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      await expect(invoiceService.cancel("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("権限なし → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(invoiceService.cancel("invoice-001")).rejects.toThrow(
        PermissionError,
      );
    });
  });

  // =================================================================
  // addLine
  // =================================================================
  describe("addLine", () => {
    it("明細行追加 + 合計再計算", async () => {
      const invoiceWithLines = {
        ...sampleInvoice,
        lines: [sampleInvoiceLine],
      };
      mockPrisma.invoice.findUnique.mockResolvedValue(invoiceWithLines);
      mockPrisma.invoiceLine.create.mockResolvedValue({
        ...sampleInvoiceLine,
        id: "iline-002",
        description: "追加明細",
      });
      mockPrisma.invoiceLine.findMany.mockResolvedValue([
        sampleInvoiceLine,
        { ...sampleInvoiceLine, id: "iline-002", amount: 5000, taxAmount: 500 },
      ]);

      const updatedInvoice = {
        ...sampleInvoice,
        amount: 20000,
        taxAmount: 2000,
        totalAmount: 22000,
        reservation: sampleReservation,
        allocations: [],
        account: null,
        lines: [
          sampleInvoiceLine,
          { ...sampleInvoiceLine, id: "iline-002", amount: 5000, taxAmount: 500 },
        ],
      };
      mockPrisma.invoice.update.mockResolvedValue(updatedInvoice);

      const result = await invoiceService.addLine("invoice-001", {
        description: "追加明細",
        quantity: 1,
        unitPrice: 5000,
        taxRate: 0.10,
      });

      expect(result.amount).toBe(20000);
      expect(result.taxAmount).toBe(2000);
      expect(result.totalAmount).toBe(22000);
    });

    it("ISSUED の請求書は明細行追加不可", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...sampleInvoice,
        status: "ISSUED",
        lines: [],
      });

      await expect(
        invoiceService.addLine("invoice-001", {
          description: "追加",
          quantity: 1,
          unitPrice: 1000,
        }),
      ).rejects.toThrow("下書きの請求書のみ明細行を追加できます");
    });

    it("請求書が存在しない → NotFoundError", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      await expect(
        invoiceService.addLine("nonexistent", {
          description: "追加",
          quantity: 1,
          unitPrice: 1000,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // =================================================================
  // updateLine
  // =================================================================
  describe("updateLine", () => {
    it("明細行更新 + 合計再計算", async () => {
      mockPrisma.invoiceLine.findUnique.mockResolvedValue({
        ...sampleInvoiceLine,
        invoice: sampleInvoice,
      });
      mockPrisma.invoiceLine.update.mockResolvedValue({
        ...sampleInvoiceLine,
        quantity: 2,
        amount: 30000,
        taxAmount: 3000,
      });
      mockPrisma.invoiceLine.findMany.mockResolvedValue([
        {
          ...sampleInvoiceLine,
          quantity: 2,
          amount: 30000,
          taxAmount: 3000,
        },
      ]);

      const updatedInvoice = {
        ...sampleInvoice,
        amount: 30000,
        taxAmount: 3000,
        totalAmount: 33000,
        reservation: sampleReservation,
        allocations: [],
        account: null,
        lines: [
          {
            ...sampleInvoiceLine,
            quantity: 2,
            amount: 30000,
            taxAmount: 3000,
          },
        ],
      };
      mockPrisma.invoice.update.mockResolvedValue(updatedInvoice);

      const result = await invoiceService.updateLine("iline-001", {
        quantity: 2,
      });

      expect(result.amount).toBe(30000);
      expect(result.taxAmount).toBe(3000);
      expect(result.totalAmount).toBe(33000);
    });

    it("ISSUED の請求書は明細行更新不可", async () => {
      mockPrisma.invoiceLine.findUnique.mockResolvedValue({
        ...sampleInvoiceLine,
        invoice: { ...sampleInvoice, status: "ISSUED" },
      });

      await expect(
        invoiceService.updateLine("iline-001", { quantity: 2 }),
      ).rejects.toThrow("下書きの請求書のみ明細行を編集できます");
    });

    it("明細行が存在しない → NotFoundError", async () => {
      mockPrisma.invoiceLine.findUnique.mockResolvedValue(null);

      await expect(
        invoiceService.updateLine("nonexistent", { quantity: 2 }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // =================================================================
  // removeLine
  // =================================================================
  describe("removeLine", () => {
    it("明細行削除 + 合計再計算", async () => {
      mockPrisma.invoiceLine.findUnique.mockResolvedValue({
        ...sampleInvoiceLine,
        invoice: sampleInvoice,
      });
      mockPrisma.invoiceLine.delete.mockResolvedValue(sampleInvoiceLine);
      mockPrisma.invoiceLine.findMany.mockResolvedValue([]);

      const updatedInvoice = {
        ...sampleInvoice,
        amount: 0,
        taxAmount: 0,
        totalAmount: 0,
        reservation: sampleReservation,
        allocations: [],
        account: null,
        lines: [],
      };
      mockPrisma.invoice.update.mockResolvedValue(updatedInvoice);

      const result = await invoiceService.removeLine("iline-001");

      expect(result.amount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it("ISSUED の請求書は明細行削除不可", async () => {
      mockPrisma.invoiceLine.findUnique.mockResolvedValue({
        ...sampleInvoiceLine,
        invoice: { ...sampleInvoice, status: "ISSUED" },
      });

      await expect(invoiceService.removeLine("iline-001")).rejects.toThrow(
        "下書きの請求書のみ明細行を削除できます",
      );
    });

    it("明細行が存在しない → NotFoundError", async () => {
      mockPrisma.invoiceLine.findUnique.mockResolvedValue(null);

      await expect(invoiceService.removeLine("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  // =================================================================
  // checkOverdue
  // =================================================================
  describe("checkOverdue", () => {
    it("ISSUED + dueDate 超過 → OVERDUE 一括更新", async () => {
      const pastDate = new Date("2026-01-01");
      const overdueInvoice1 = {
        ...sampleInvoice,
        id: "invoice-overdue-1",
        status: "ISSUED" as const,
        dueDate: pastDate,
      };
      const overdueInvoice2 = {
        ...sampleInvoice,
        id: "invoice-overdue-2",
        status: "ISSUED" as const,
        dueDate: pastDate,
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        overdueInvoice1,
        overdueInvoice2,
      ]);

      const updated1 = {
        ...overdueInvoice1,
        status: "OVERDUE" as const,
        reservation: sampleReservation,
        allocations: [],
        account: null,
        lines: [],
      };
      const updated2 = {
        ...overdueInvoice2,
        status: "OVERDUE" as const,
        reservation: sampleReservation,
        allocations: [],
        account: null,
        lines: [],
      };

      mockPrisma.invoice.update
        .mockResolvedValueOnce(updated1)
        .mockResolvedValueOnce(updated2);

      const result = await invoiceService.checkOverdue();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("OVERDUE");
      expect(result[1].status).toBe("OVERDUE");
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2);
      expect(mockEventBus.emit).toHaveBeenCalledWith("invoice.overdue", {
        invoice: updated1,
        userId: adminUser.id,
      });
    });

    it("該当なしの場合は空配列を返す", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      const result = await invoiceService.checkOverdue();

      expect(result).toEqual([]);
      expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    });
  });

  // =================================================================
  // create（accountId + lines 付き）
  // =================================================================
  describe("create with accountId and lines", () => {
    it("accountId + lines 付きの作成", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          invoice: {
            create: vi.fn().mockResolvedValue({
              ...sampleInvoice,
              invoiceNumber: "IV-00001",
              accountId: "account-001",
              lines: [sampleInvoiceLine],
            }),
          },
          reservation: {
            update: vi.fn().mockResolvedValue(sampleReservation),
          },
        };
        return fn(tx);
      });

      const result = await invoiceService.create({
        ...validInvoiceInput,
        accountId: "account-001",
        lines: [
          { description: "コンパクトカー（3日間）", quantity: 1, unitPrice: 15000, taxRate: 0.10 },
        ],
      });

      expect(result.invoiceNumber).toBe("IV-00001");
      expect(result.accountId).toBe("account-001");
    });
  });
});
