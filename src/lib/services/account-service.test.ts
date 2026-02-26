/**
 * account-service のユニットテスト
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
  memberUser,
  sampleAccount,
  validAccountInput,
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

const { accountService } = await import("@/lib/services/account-service");

describe("accountService", () => {
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
      const accounts = [sampleAccount];
      mockPrisma.account.findMany.mockResolvedValue(accounts);
      mockPrisma.account.count.mockResolvedValue(1);

      const result = await accountService.list({});

      expect(result).toEqual({ data: accounts, total: 1 });
      expect(mockPrisma.account.findMany).toHaveBeenCalled();
      expect(mockPrisma.account.count).toHaveBeenCalled();
    });

    it("フィルタ・ページネーションパラメータを転送する", async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);

      const where = { accountType: "CORPORATE" as const };
      await accountService.list({ where, skip: 10, take: 20 });

      expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where, skip: 10, take: 20 }),
      );
      expect(mockPrisma.account.count).toHaveBeenCalledWith({ where });
    });
  });

  // =================================================================
  // get
  // =================================================================
  describe("get", () => {
    it("IDで取得（関連データ含む）", async () => {
      const accountWithRelations = {
        ...sampleAccount,
        quotations: [],
        invoices: [],
        reservations: [],
      };
      mockPrisma.account.findUnique.mockResolvedValue(accountWithRelations);

      const result = await accountService.get("account-001");

      expect(result).toEqual(accountWithRelations);
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "account-001" },
          include: {
            quotations: true,
            invoices: true,
            reservations: true,
          },
        }),
      );
    });

    it("存在しない場合 null を返す", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      const result = await accountService.get("nonexistent");

      expect(result).toBeNull();
    });
  });

  // =================================================================
  // create
  // =================================================================
  describe("create", () => {
    it("AC-NNNNN 自動採番で作成 + イベント発火", async () => {
      mockPrisma.account.findFirst.mockResolvedValue({
        accountCode: "AC-00005",
      });

      const created = { ...sampleAccount, accountCode: "AC-00006" };
      mockPrisma.account.create.mockResolvedValue(created);

      const result = await accountService.create(validAccountInput);

      expect(result.accountCode).toBe("AC-00006");
      expect(mockEventBus.emit).toHaveBeenCalledWith("account.created", {
        account: created,
        userId: adminUser.id,
      });
    });

    it("初回（既存なし）は AC-00001", async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const created = { ...sampleAccount, accountCode: "AC-00001" };
      mockPrisma.account.create.mockResolvedValue(created);

      const result = await accountService.create(validAccountInput);

      expect(result.accountCode).toBe("AC-00001");
    });

    it("バリデーションエラー: accountName 未入力", async () => {
      await expect(
        accountService.create({ ...validAccountInput, accountName: "" }),
      ).rejects.toThrow(ValidationError);
    });

    it("権限不足 → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(accountService.create(validAccountInput)).rejects.toThrow(
        PermissionError,
      );
    });

    it("unique 違反 → ValidationError", async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      mockPrisma.account.create.mockRejectedValue({
        code: "P2002",
        meta: { target: ["accountCode"] },
      });

      await expect(accountService.create(validAccountInput)).rejects.toThrow(
        "取引先コードが重複しています",
      );
    });
  });

  // =================================================================
  // update
  // =================================================================
  describe("update", () => {
    it("正常更新", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(sampleAccount);
      const updated = { ...sampleAccount, accountName: "更新法人" };
      mockPrisma.account.update.mockResolvedValue(updated);

      const result = await accountService.update("account-001", {
        accountName: "更新法人",
      });

      expect(result.accountName).toBe("更新法人");
      expect(mockEventBus.emit).toHaveBeenCalledWith("account.updated", {
        account: updated,
        userId: adminUser.id,
      });
    });

    it("存在しない場合 NotFoundError", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(
        accountService.update("nonexistent", validAccountInput),
      ).rejects.toThrow(NotFoundError);
    });

    it("権限不足 → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(
        accountService.update("account-001", validAccountInput),
      ).rejects.toThrow(PermissionError);
    });
  });

  // =================================================================
  // delete
  // =================================================================
  describe("delete", () => {
    it("正常削除（関連データなし）", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        ...sampleAccount,
        _count: { quotations: 0, invoices: 0, reservations: 0 },
      });
      mockPrisma.account.delete.mockResolvedValue(sampleAccount);

      await accountService.delete("account-001");

      expect(mockPrisma.account.delete).toHaveBeenCalledWith({
        where: { id: "account-001" },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith("account.deleted", {
        id: "account-001",
        userId: adminUser.id,
      });
    });

    it("関連データがある場合削除不可", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        ...sampleAccount,
        _count: { quotations: 2, invoices: 1, reservations: 0 },
      });

      await expect(accountService.delete("account-001")).rejects.toThrow(
        "関連データ（見積2件・請求書1件）が存在するため削除できません",
      );
    });

    it("権限不足（MEMBER では削除不可）", async () => {
      mockGetCurrentUser.mockResolvedValue(memberUser);
      mockHasRole.mockReturnValue(false);

      await expect(accountService.delete("account-001")).rejects.toThrow(
        "削除にはマネージャー以上の権限が必要です",
      );
    });

    it("存在しない場合 NotFoundError", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(accountService.delete("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  // =================================================================
  // calculateDueDate
  // =================================================================
  describe("calculateDueDate", () => {
    it("月末締め翌月末払い（closingDay=31, paymentMonthOffset=1, paymentDay=null）", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        closingDay: 31,
        paymentMonthOffset: 1,
        paymentDay: null,
      });

      // 2026-03-20 発行 → 締月: 3月 → 支払月: 4月 → 4月末
      const result = await accountService.calculateDueDate(
        "account-001",
        new Date("2026-03-20"),
      );

      expect(result).toEqual(new Date(2026, 3, 30)); // 4月30日（4月末）
    });

    it("20日締め翌月10日払い（closingDay=20, paymentMonthOffset=1, paymentDay=10）", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        closingDay: 20,
        paymentMonthOffset: 1,
        paymentDay: 10,
      });

      // 2026-03-15 発行 → 締月: 3月 → 支払月: 4月 → 4月10日
      const result = await accountService.calculateDueDate(
        "account-001",
        new Date("2026-03-15"),
      );

      expect(result).toEqual(new Date(2026, 3, 10)); // 4月10日
    });

    it("締日超過の場合は翌月が締月", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        closingDay: 20,
        paymentMonthOffset: 1,
        paymentDay: 10,
      });

      // 2026-03-25 発行 → 締月: 4月 → 支払月: 5月 → 5月10日
      const result = await accountService.calculateDueDate(
        "account-001",
        new Date("2026-03-25"),
      );

      expect(result).toEqual(new Date(2026, 4, 10)); // 5月10日
    });

    it("締日未設定 → issueDate + 30日", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        closingDay: null,
        paymentMonthOffset: null,
        paymentDay: null,
      });

      const result = await accountService.calculateDueDate(
        "account-001",
        new Date("2026-03-20"),
      );

      expect(result).toEqual(new Date("2026-04-19")); // 30日後
    });

    it("取引先が存在しない → NotFoundError", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(
        accountService.calculateDueDate("nonexistent", new Date()),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
