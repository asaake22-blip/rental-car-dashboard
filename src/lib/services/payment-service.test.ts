import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  adminUser,
  managerUser,
  memberUser,
  samplePayment,
  samplePaymentAllocation,
  sampleReservation,
  validPaymentInput,
  validAllocationInput,
} from "@/__tests__/helpers/fixtures";
import {
  mockPrisma,
  mockGetCurrentUser,
  mockHasRole,
  mockEventBus,
} from "@/__tests__/helpers/setup";
import type { CurrentUser } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
  hasRole: mockHasRole,
}));
vi.mock("@/lib/events/event-bus", () => ({ eventBus: mockEventBus }));
vi.mock("@/lib/events/handlers", () => ({}));
vi.mock("@/generated/prisma/client", () => ({}));

import { paymentService } from "./payment-service";
import {
  ValidationError,
  PermissionError,
  NotFoundError,
} from "@/lib/errors";

/** 精算済み予約データ */
const settledReservation = {
  ...sampleReservation,
  status: "SETTLED" as const,
  actualAmount: 100000,
  taxAmount: 10000,
  settledAt: new Date("2026-03-04"),
};

describe("paymentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    mockHasRole.mockImplementation((user: CurrentUser, role: string) => {
      const h: Record<string, number> = { ADMIN: 3, MANAGER: 2, MEMBER: 1 };
      return h[user.role] >= h[role];
    });
  });

  describe("create", () => {
    it("有効な入力で Payment を作成し PM-NNNNN 自動採番する", async () => {
      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              ...samplePayment,
              paymentNumber: "PM-00001",
            }),
            findUnique: vi.fn().mockResolvedValue({
              ...samplePayment,
              paymentNumber: "PM-00001",
            }),
          },
        };
        return fn(tx);
      });

      const result = await paymentService.create(validPaymentInput);

      expect(result.paymentNumber).toBe("PM-00001");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "payment.created",
        expect.objectContaining({
          userId: adminUser.id,
        }),
      );
    });

    it("allocations 同時指定で消込も作成する", async () => {
      const inputWithAllocations = {
        ...validPaymentInput,
        allocations: [validAllocationInput],
      };

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              ...samplePayment,
              id: "payment-new",
              paymentNumber: "PM-00001",
            }),
            findUnique: vi.fn().mockResolvedValue({
              ...samplePayment,
              id: "payment-new",
              paymentNumber: "PM-00001",
              allocations: [samplePaymentAllocation],
            }),
            update: vi.fn().mockResolvedValue({
              ...samplePayment,
              status: "FULLY_ALLOCATED",
            }),
          },
          reservation: {
            findUnique: vi.fn().mockResolvedValue(settledReservation),
          },
          paymentAllocation: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { allocatedAmount: 0 } }),
            create: vi.fn().mockResolvedValue(samplePaymentAllocation),
          },
        };
        return fn(tx);
      });

      const result = await paymentService.create(inputWithAllocations);

      expect(result.paymentNumber).toBe("PM-00001");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "payment.created",
        expect.objectContaining({
          userId: adminUser.id,
        }),
      );
    });

    it("バリデーション失敗時に ValidationError を throw する", async () => {
      const invalidInput = { ...validPaymentInput, payerName: "" };
      await expect(paymentService.create(invalidInput)).rejects.toThrow(
        ValidationError,
      );
    });

    it("権限不足時に PermissionError を throw する", async () => {
      mockHasRole.mockReturnValue(false);
      await expect(paymentService.create(validPaymentInput)).rejects.toThrow(
        PermissionError,
      );
    });

    it("消込合計が入金額を超える場合 ValidationError を throw する", async () => {
      const inputWithExcessAllocations = {
        ...validPaymentInput,
        amount: 100000,
        allocations: [{ reservationId: "reservation-001", allocatedAmount: 150000 }],
      };

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              ...samplePayment,
              amount: 100000,
            }),
          },
          reservation: {
            findUnique: vi.fn().mockResolvedValue(settledReservation),
          },
          paymentAllocation: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { allocatedAmount: 0 } }),
          },
        };
        return fn(tx);
      });

      await expect(
        paymentService.create(inputWithExcessAllocations),
      ).rejects.toThrow("消込合計が入金額を超えています");
    });

    it("未精算予約への消込で ValidationError を throw する", async () => {
      const inputWithAllocations = {
        ...validPaymentInput,
        allocations: [validAllocationInput],
      };

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(samplePayment),
          },
          reservation: {
            findUnique: vi.fn().mockResolvedValue({
              ...sampleReservation,
              actualAmount: null,
            }),
          },
          paymentAllocation: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { allocatedAmount: 0 } }),
          },
        };
        return fn(tx);
      });

      await expect(
        paymentService.create(inputWithAllocations),
      ).rejects.toThrow("精算済みの予約のみ消込できます");
    });

    it("P2002 エラー (externalId) を ValidationError に変換する", async () => {
      (mockPrisma.$transaction as any).mockRejectedValue({
        code: "P2002",
        meta: { target: ["externalId"] },
      });

      await expect(paymentService.create(validPaymentInput)).rejects.toThrow(
        "この外部IDは既に登録されています",
      );
    });
  });

  describe("update", () => {
    it("有効な入力でヘッダー更新成功", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(samplePayment);
      mockPrisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { allocatedAmount: 0 },
      });

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            update: vi.fn().mockResolvedValue({
              ...samplePayment,
              payerName: "更新後の入金者",
            }),
            findUnique: vi.fn().mockResolvedValue({
              ...samplePayment,
              payerName: "更新後の入金者",
            }),
          },
          paymentAllocation: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { allocatedAmount: 0 } }),
          },
        };
        return fn(tx);
      });

      const result = await paymentService.update("payment-001", {
        ...validPaymentInput,
        payerName: "更新後の入金者",
      });

      expect(result.payerName).toBe("更新後の入金者");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "payment.updated",
        expect.objectContaining({
          userId: adminUser.id,
        }),
      );
    });

    it("存在しない入金の更新時に NotFoundError を throw する", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        paymentService.update("nonexistent", validPaymentInput),
      ).rejects.toThrow(NotFoundError);
    });

    it("金額を消込合計未満に変更時に ValidationError を throw する", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(samplePayment);
      mockPrisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { allocatedAmount: 100000 },
      });

      await expect(
        paymentService.update("payment-001", {
          ...validPaymentInput,
          amount: 50000,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("delete", () => {
    it("MANAGER 以上で削除成功", async () => {
      mockGetCurrentUser.mockResolvedValue(managerUser);
      mockPrisma.payment.findUnique.mockResolvedValue(samplePayment);
      mockPrisma.payment.delete.mockResolvedValue(samplePayment);

      await paymentService.delete("payment-001");

      expect(mockPrisma.payment.delete).toHaveBeenCalledWith({
        where: { id: "payment-001" },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "payment.deleted",
        expect.objectContaining({
          userId: managerUser.id,
        }),
      );
    });

    it("MEMBER は PermissionError を throw する", async () => {
      mockGetCurrentUser.mockResolvedValue(memberUser);
      mockHasRole.mockReturnValue(false);

      await expect(paymentService.delete("payment-001")).rejects.toThrow(
        PermissionError,
      );
    });

    it("存在しない入金の削除時に NotFoundError を throw する", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(paymentService.delete("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("addAllocation", () => {
    it("有効な入力で消込追加 + ステータス更新", async () => {
      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue({
              ...samplePayment,
              amount: 110000,
            }),
            update: vi.fn().mockResolvedValue({
              ...samplePayment,
              status: "FULLY_ALLOCATED",
            }),
          },
          reservation: {
            findUnique: vi.fn().mockResolvedValue(settledReservation),
          },
          paymentAllocation: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { allocatedAmount: 0 } }),
            create: vi.fn().mockResolvedValue(samplePaymentAllocation),
          },
        };
        return fn(tx);
      });

      mockPrisma.payment.findUnique.mockResolvedValue({
        ...samplePayment,
        status: "FULLY_ALLOCATED",
      });

      const result = await paymentService.addAllocation(
        "payment-001",
        validAllocationInput,
      );

      expect(result.reservationId).toBe("reservation-001");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "payment.allocated",
        expect.objectContaining({
          userId: adminUser.id,
        }),
      );
    });

    it("入金残額不足時に ValidationError を throw する", async () => {
      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue({
              ...samplePayment,
              amount: 100000,
            }),
          },
          reservation: {
            findUnique: vi.fn().mockResolvedValue(settledReservation),
          },
          paymentAllocation: {
            aggregate: vi.fn().mockResolvedValue({
              _sum: { allocatedAmount: 50000 },
            }),
          },
        };
        return fn(tx);
      });

      await expect(
        paymentService.addAllocation("payment-001", {
          reservationId: "reservation-001",
          allocatedAmount: 60000,
        }),
      ).rejects.toThrow("消込金額が入金の残額を超えています");
    });

    it("予約残額不足時に ValidationError を throw する", async () => {
      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue({
              ...samplePayment,
              amount: 200000,
            }),
          },
          reservation: {
            findUnique: vi.fn().mockResolvedValue({
              ...settledReservation,
              actualAmount: 100000,
              taxAmount: 10000,
            }),
          },
          paymentAllocation: {
            aggregate: vi
              .fn()
              .mockResolvedValueOnce({ _sum: { allocatedAmount: 0 } })
              .mockResolvedValueOnce({ _sum: { allocatedAmount: 60000 } }),
          },
        };
        return fn(tx);
      });

      await expect(
        paymentService.addAllocation("payment-001", {
          reservationId: "reservation-001",
          allocatedAmount: 60000,
        }),
      ).rejects.toThrow("消込金額が予約の残額を超えています");
    });

    it("未精算予約への消込で ValidationError を throw する", async () => {
      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(samplePayment),
          },
          reservation: {
            findUnique: vi.fn().mockResolvedValue({
              ...sampleReservation,
              actualAmount: null,
            }),
          },
          paymentAllocation: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { allocatedAmount: 0 } }),
          },
        };
        return fn(tx);
      });

      await expect(
        paymentService.addAllocation("payment-001", validAllocationInput),
      ).rejects.toThrow("精算済みの予約のみ消込できます");
    });

    it("重複ペアで P2002 → ValidationError に変換する", async () => {
      (mockPrisma.$transaction as any).mockRejectedValue({
        code: "P2002",
        meta: { target: ["paymentId", "reservationId"] },
      });

      await expect(
        paymentService.addAllocation("payment-001", validAllocationInput),
      ).rejects.toThrow("この予約は既にこの入金に消込されています");
    });
  });

  describe("bulkAllocate", () => {
    it("複数予約への一括消込成功", async () => {
      const bulkInput = {
        allocations: [
          { reservationId: "reservation-001", allocatedAmount: 50000 },
          { reservationId: "reservation-002", allocatedAmount: 60000 },
        ],
      };

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue({
              ...samplePayment,
              amount: 110000,
            }),
            update: vi.fn().mockResolvedValue({
              ...samplePayment,
              status: "FULLY_ALLOCATED",
            }),
          },
          reservation: {
            findUnique: vi.fn().mockResolvedValue(settledReservation),
          },
          paymentAllocation: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { allocatedAmount: 0 } }),
            create: vi.fn().mockImplementation((data: any) => ({
              ...samplePaymentAllocation,
              reservationId: data.data.reservationId,
              allocatedAmount: data.data.allocatedAmount,
            })),
          },
        };
        return fn(tx);
      });

      const result = await paymentService.bulkAllocate("payment-001", bulkInput);

      expect(result).toHaveLength(2);
    });

    it("合計が入金残額を超過時に ValidationError を throw する", async () => {
      const bulkInput = {
        allocations: [
          { reservationId: "reservation-001", allocatedAmount: 60000 },
          { reservationId: "reservation-002", allocatedAmount: 60000 },
        ],
      };

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue({
              ...samplePayment,
              amount: 100000,
            }),
          },
          reservation: {
            findUnique: vi.fn().mockResolvedValue(settledReservation),
          },
          paymentAllocation: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { allocatedAmount: 0 } }),
            create: vi.fn().mockResolvedValue(samplePaymentAllocation),
          },
        };
        return fn(tx);
      });

      await expect(
        paymentService.bulkAllocate("payment-001", bulkInput),
      ).rejects.toThrow("消込合計が入金額を超えています");
    });
  });

  describe("updateAllocation", () => {
    it("消込金額変更 + ステータス再計算", async () => {
      mockPrisma.paymentAllocation.findUnique.mockResolvedValue({
        ...samplePaymentAllocation,
        payment: samplePayment,
        reservation: settledReservation,
      });

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue({
              ...samplePayment,
              amount: 110000,
            }),
            update: vi.fn().mockResolvedValue({
              ...samplePayment,
              status: "PARTIALLY_ALLOCATED",
            }),
          },
          reservation: {
            findUnique: vi.fn().mockResolvedValue(settledReservation),
          },
          paymentAllocation: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { allocatedAmount: 50000 } }),
            update: vi.fn().mockResolvedValue({
              ...samplePaymentAllocation,
              allocatedAmount: 50000,
            }),
          },
        };
        return fn(tx);
      });

      const result = await paymentService.updateAllocation("alloc-001", {
        reservationId: "reservation-001",
        allocatedAmount: 50000,
      });

      expect(result.allocatedAmount).toBe(50000);
    });
  });

  describe("removeAllocation", () => {
    it("消込削除 + ステータス再計算（FULLY → UNALLOCATED）", async () => {
      mockPrisma.paymentAllocation.findUnique.mockResolvedValue({
        ...samplePaymentAllocation,
        paymentId: "payment-001",
      });

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(samplePayment),
            update: vi.fn().mockResolvedValue({
              ...samplePayment,
              status: "UNALLOCATED",
            }),
          },
          paymentAllocation: {
            delete: vi.fn().mockResolvedValue(samplePaymentAllocation),
            aggregate: vi.fn().mockResolvedValue({ _sum: { allocatedAmount: 0 } }),
          },
        };
        return fn(tx);
      });

      await paymentService.removeAllocation("alloc-001");

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("存在しない消込の削除時に NotFoundError を throw する", async () => {
      mockPrisma.paymentAllocation.findUnique.mockResolvedValue(null);

      await expect(
        paymentService.removeAllocation("nonexistent"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("list", () => {
    it("ページネーション + フィルタで一覧取得", async () => {
      const payments = [samplePayment];
      mockPrisma.payment.findMany.mockResolvedValue(payments);
      mockPrisma.payment.count.mockResolvedValue(1);

      const result = await paymentService.list({
        where: { status: "UNALLOCATED" },
        skip: 0,
        take: 50,
      });

      expect(result.data).toEqual(payments);
      expect(result.total).toBe(1);
    });
  });

  describe("get", () => {
    it("正常取得", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(samplePayment);

      const result = await paymentService.get("payment-001");

      expect(result).toEqual(samplePayment);
    });

    it("存在しない場合 NotFoundError を throw する", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(paymentService.get("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getReservationPaymentSummary", () => {
    it("予約の入金状況サマリを取得", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...settledReservation,
        actualAmount: 100000,
        taxAmount: 10000,
      });
      mockPrisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { allocatedAmount: 50000 },
      });

      const result = await paymentService.getReservationPaymentSummary("reservation-001");

      expect(result.totalAmount).toBe(110000);
      expect(result.allocatedAmount).toBe(50000);
      expect(result.remainingAmount).toBe(60000);
    });

    it("存在しない予約で NotFoundError を throw する", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(null);

      await expect(
        paymentService.getReservationPaymentSummary("nonexistent"),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
