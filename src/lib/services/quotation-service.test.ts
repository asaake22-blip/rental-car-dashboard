/**
 * quotation-service のユニットテスト
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
  sampleAccount,
  sampleQuotation,
  sampleQuotationLine,
  sampleVehicleClass,
  validQuotationInput,
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

mockPrisma.$transaction.mockImplementation(
  async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
);

const { quotationService } = await import("@/lib/services/quotation-service");

describe("quotationService", () => {
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
      const quotations = [
        {
          ...sampleQuotation,
          account: sampleAccount,
          lines: [sampleQuotationLine],
          vehicleClass: sampleVehicleClass,
        },
      ];
      mockPrisma.quotation.findMany.mockResolvedValue(quotations);
      mockPrisma.quotation.count.mockResolvedValue(1);

      const result = await quotationService.list({});

      expect(result).toEqual({ data: quotations, total: 1 });
      expect(mockPrisma.quotation.findMany).toHaveBeenCalled();
      expect(mockPrisma.quotation.count).toHaveBeenCalled();
    });

    it("フィルタ・ページネーションパラメータを転送する", async () => {
      mockPrisma.quotation.findMany.mockResolvedValue([]);
      mockPrisma.quotation.count.mockResolvedValue(0);

      const where = { status: "DRAFT" as const };
      await quotationService.list({ where, skip: 10, take: 20 });

      expect(mockPrisma.quotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where, skip: 10, take: 20 }),
      );
      expect(mockPrisma.quotation.count).toHaveBeenCalledWith({ where });
    });
  });

  // =================================================================
  // get
  // =================================================================
  describe("get", () => {
    it("IDで取得（関連データ含む）", async () => {
      const quotationWithRelations = {
        ...sampleQuotation,
        account: sampleAccount,
        lines: [sampleQuotationLine],
        vehicleClass: sampleVehicleClass,
        pickupOffice: { id: "office-001", officeName: "越谷" },
        returnOffice: { id: "office-001", officeName: "越谷" },
        reservation: null,
      };
      mockPrisma.quotation.findUnique.mockResolvedValue(quotationWithRelations);

      const result = await quotationService.get("quotation-001");

      expect(result).toEqual(quotationWithRelations);
      expect(mockPrisma.quotation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "quotation-001" } }),
      );
    });

    it("存在しない場合 null を返す", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue(null);

      const result = await quotationService.get("nonexistent");

      expect(result).toBeNull();
    });
  });

  // =================================================================
  // create
  // =================================================================
  describe("create", () => {
    it("QT-NNNNN 自動採番 + 明細行同時作成 + 金額計算", async () => {
      mockPrisma.quotation.findFirst.mockResolvedValue({
        quotationCode: "QT-00005",
      });
      mockPrisma.account.findUnique.mockResolvedValue(sampleAccount);

      const created = {
        ...sampleQuotation,
        quotationCode: "QT-00006",
        account: sampleAccount,
        lines: [sampleQuotationLine],
        vehicleClass: sampleVehicleClass,
      };
      mockPrisma.quotation.create.mockResolvedValue(created);

      const result = await quotationService.create(validQuotationInput);

      expect(result.quotationCode).toBe("QT-00006");
      expect(mockPrisma.quotation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quotationCode: "QT-00006",
            amount: 15000,
            taxAmount: 1500,
            totalAmount: 16500,
            lines: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  description: "コンパクトカー（3日間）",
                  quantity: 1,
                  unitPrice: 15000,
                  amount: 15000,
                  taxRate: 0.10,
                  taxAmount: 1500,
                }),
              ]),
            },
          }),
        }),
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith("quotation.created", {
        quotation: created,
        userId: adminUser.id,
      });
    });

    it("初回（既存なし）は QT-00001", async () => {
      mockPrisma.quotation.findFirst.mockResolvedValue(null);
      mockPrisma.account.findUnique.mockResolvedValue(sampleAccount);

      const created = { ...sampleQuotation, quotationCode: "QT-00001" };
      mockPrisma.quotation.create.mockResolvedValue(created);

      const result = await quotationService.create(validQuotationInput);

      expect(result.quotationCode).toBe("QT-00001");
    });

    it("Account が存在しない → NotFoundError", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(quotationService.create(validQuotationInput)).rejects.toThrow(
        "指定された取引先が見つかりません",
      );
    });

    it("バリデーションエラー", async () => {
      await expect(
        quotationService.create({ ...validQuotationInput, customerName: "" }),
      ).rejects.toThrow(ValidationError);
    });

    it("権限不足 → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(quotationService.create(validQuotationInput)).rejects.toThrow(
        PermissionError,
      );
    });
  });

  // =================================================================
  // update
  // =================================================================
  describe("update", () => {
    it("DRAFT の正常更新（明細行置換）", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue(sampleQuotation);
      mockPrisma.quotationLine.deleteMany.mockResolvedValue({ count: 1 });

      const updated = {
        ...sampleQuotation,
        customerName: "更新法人",
        account: sampleAccount,
        lines: [{ ...sampleQuotationLine, description: "新明細" }],
        vehicleClass: sampleVehicleClass,
      };
      mockPrisma.quotation.update.mockResolvedValue(updated);

      const result = await quotationService.update("quotation-001", {
        customerName: "更新法人",
        lines: [
          { description: "新明細", quantity: 1, unitPrice: 15000, taxRate: 0.10 },
        ],
      });

      expect(result.customerName).toBe("更新法人");
      expect(mockPrisma.quotationLine.deleteMany).toHaveBeenCalledWith({
        where: { quotationId: "quotation-001" },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith("quotation.updated", {
        quotation: updated,
        userId: adminUser.id,
      });
    });

    it("ACCEPTED は編集不可", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "ACCEPTED",
      });

      await expect(
        quotationService.update("quotation-001", { customerName: "更新" }),
      ).rejects.toThrow(ValidationError);
    });

    it("存在しない → NotFoundError", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue(null);

      await expect(
        quotationService.update("nonexistent", {}),
      ).rejects.toThrow(NotFoundError);
    });

    it("権限不足 → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(
        quotationService.update("quotation-001", {}),
      ).rejects.toThrow(PermissionError);
    });
  });

  // =================================================================
  // delete
  // =================================================================
  describe("delete", () => {
    it("DRAFT の正常削除", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue(sampleQuotation);
      const deleted = {
        ...sampleQuotation,
        account: sampleAccount,
        lines: [sampleQuotationLine],
        vehicleClass: sampleVehicleClass,
      };
      mockPrisma.quotation.delete.mockResolvedValue(deleted);

      await quotationService.delete("quotation-001");

      expect(mockPrisma.quotation.delete).toHaveBeenCalledWith({
        where: { id: "quotation-001" },
        include: expect.any(Object),
      });
    });

    it("予約紐づけ済みは削除不可", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        reservationId: "reservation-001",
      });

      await expect(quotationService.delete("quotation-001")).rejects.toThrow(
        "予約に紐づいている見積書は削除できません",
      );
    });

    it("SENT は削除不可", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "SENT",
      });

      await expect(quotationService.delete("quotation-001")).rejects.toThrow(
        ValidationError,
      );
    });

    it("存在しない → NotFoundError", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue(null);

      await expect(quotationService.delete("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  // =================================================================
  // send
  // =================================================================
  describe("send", () => {
    it("DRAFT → SENT", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue(sampleQuotation);
      const sent = {
        ...sampleQuotation,
        status: "SENT" as const,
        account: sampleAccount,
        lines: [sampleQuotationLine],
        vehicleClass: sampleVehicleClass,
      };
      mockPrisma.quotation.update.mockResolvedValue(sent);

      const result = await quotationService.send("quotation-001");

      expect(result.status).toBe("SENT");
      expect(mockEventBus.emit).toHaveBeenCalledWith("quotation.sent", {
        quotation: sent,
        userId: adminUser.id,
      });
    });

    it("SENT は送付不可", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "SENT",
      });

      await expect(quotationService.send("quotation-001")).rejects.toThrow(
        ValidationError,
      );
    });

    it("存在しない → NotFoundError", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue(null);

      await expect(quotationService.send("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  // =================================================================
  // accept
  // =================================================================
  describe("accept", () => {
    it("SENT → ACCEPTED", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "SENT",
      });
      const accepted = {
        ...sampleQuotation,
        status: "ACCEPTED" as const,
        account: sampleAccount,
        lines: [sampleQuotationLine],
        vehicleClass: sampleVehicleClass,
      };
      mockPrisma.quotation.update.mockResolvedValue(accepted);

      const result = await quotationService.accept("quotation-001");

      expect(result.status).toBe("ACCEPTED");
      expect(mockEventBus.emit).toHaveBeenCalledWith("quotation.accepted", {
        quotation: accepted,
        userId: adminUser.id,
      });
    });

    it("DRAFT は承諾不可", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "DRAFT",
      });

      await expect(quotationService.accept("quotation-001")).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // =================================================================
  // reject
  // =================================================================
  describe("reject", () => {
    it("SENT → REJECTED", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "SENT",
      });
      const rejected = {
        ...sampleQuotation,
        status: "REJECTED" as const,
        account: sampleAccount,
        lines: [sampleQuotationLine],
        vehicleClass: sampleVehicleClass,
      };
      mockPrisma.quotation.update.mockResolvedValue(rejected);

      const result = await quotationService.reject("quotation-001");

      expect(result.status).toBe("REJECTED");
      expect(mockEventBus.emit).toHaveBeenCalledWith("quotation.rejected", {
        quotation: rejected,
        userId: adminUser.id,
      });
    });

    it("DRAFT は不成立にできない", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "DRAFT",
      });

      await expect(quotationService.reject("quotation-001")).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // =================================================================
  // expire
  // =================================================================
  describe("expire", () => {
    it("SENT → EXPIRED", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "SENT",
      });
      const expired = {
        ...sampleQuotation,
        status: "EXPIRED" as const,
        account: sampleAccount,
        lines: [sampleQuotationLine],
        vehicleClass: sampleVehicleClass,
      };
      mockPrisma.quotation.update.mockResolvedValue(expired);

      const result = await quotationService.expire("quotation-001");

      expect(result.status).toBe("EXPIRED");
    });

    it("DRAFT は期限切れにできない", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "DRAFT",
      });

      await expect(quotationService.expire("quotation-001")).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // =================================================================
  // convertToReservation
  // =================================================================
  describe("convertToReservation", () => {
    it("正常変換（RS-NNNNN 採番、Reservation 作成確認）", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "ACCEPTED",
        account: sampleAccount,
      });
      mockPrisma.reservation.findFirst.mockResolvedValue({
        reservationCode: "RS-00010",
      });

      const reservation = {
        id: "reservation-new",
        reservationCode: "RS-00011",
      };
      mockPrisma.reservation.create.mockResolvedValue(reservation);

      const updated = {
        ...sampleQuotation,
        reservationId: reservation.id,
        account: sampleAccount,
        lines: [sampleQuotationLine],
        vehicleClass: sampleVehicleClass,
        reservation,
      };
      mockPrisma.quotation.update.mockResolvedValue(updated);

      const result = await quotationService.convertToReservation("quotation-001");

      expect(result.reservationId).toBe(reservation.id);
      expect(mockPrisma.reservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reservationCode: "RS-00011",
          vehicleClassId: "vc-1",
          customerName: "テスト法人株式会社",
          accountId: "account-001",
          estimatedAmount: 16500,
        }),
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith("quotation.converted", {
        quotation: updated,
        reservationId: reservation.id,
        userId: adminUser.id,
      });
    });

    it("既に変換済みの場合拒否", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "ACCEPTED",
        reservationId: "reservation-001",
        account: sampleAccount,
      });

      await expect(
        quotationService.convertToReservation("quotation-001"),
      ).rejects.toThrow("この見積書は既に予約に変換済みです");
    });

    it("必須フィールド不足（vehicleClassId なし）の場合拒否", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "ACCEPTED",
        vehicleClassId: null,
        account: sampleAccount,
      });

      await expect(
        quotationService.convertToReservation("quotation-001"),
      ).rejects.toThrow("車両クラスが設定されていないため予約に変換できません");
    });

    it("必須フィールド不足（pickupDate なし）の場合拒否", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "ACCEPTED",
        pickupDate: null,
        account: sampleAccount,
      });

      await expect(
        quotationService.convertToReservation("quotation-001"),
      ).rejects.toThrow("出発日・帰着日が設定されていないため予約に変換できません");
    });

    it("DRAFT は変換不可", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue({
        ...sampleQuotation,
        status: "DRAFT",
        account: sampleAccount,
      });

      await expect(
        quotationService.convertToReservation("quotation-001"),
      ).rejects.toThrow(ValidationError);
    });

    it("存在しない → NotFoundError", async () => {
      mockPrisma.quotation.findUnique.mockResolvedValue(null);

      await expect(
        quotationService.convertToReservation("nonexistent"),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
