import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  adminUser,
  managerUser,
  memberUser,
  samplePaymentTerminal,
  validTerminalInput,
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

import { terminalService } from "./terminal-service";
import {
  ValidationError,
  PermissionError,
  NotFoundError,
} from "@/lib/errors";

describe("terminalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    mockHasRole.mockImplementation((user: CurrentUser, role: string) => {
      const h: Record<string, number> = { ADMIN: 3, MANAGER: 2, MEMBER: 1 };
      return h[user.role] >= h[role];
    });
  });

  describe("create", () => {
    it("有効な入力で端末作成 + TM-NNNNN 自動採番する", async () => {
      mockPrisma.paymentTerminal.findFirst.mockResolvedValue(null);
      mockPrisma.paymentTerminal.create.mockResolvedValue({
        ...samplePaymentTerminal,
        terminalCode: "TM-00001",
      });

      const result = await terminalService.create(validTerminalInput);

      expect(result.terminalCode).toBe("TM-00001");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "terminal.created",
        expect.objectContaining({
          userId: adminUser.id,
        }),
      );
    });

    it("シリアル番号重複時に ValidationError を throw する", async () => {
      mockPrisma.paymentTerminal.findFirst.mockResolvedValue(null);
      mockPrisma.paymentTerminal.create.mockRejectedValue({
        code: "P2002",
        meta: { target: ["serialNumber"] },
      });

      await expect(terminalService.create(validTerminalInput)).rejects.toThrow(
        "このシリアル番号は既に登録されています",
      );
    });

    it("バリデーション失敗時に ValidationError を throw する", async () => {
      const invalidInput = { ...validTerminalInput, terminalName: "" };
      await expect(terminalService.create(invalidInput)).rejects.toThrow(
        ValidationError,
      );
    });

    it("権限不足時に PermissionError を throw する", async () => {
      mockHasRole.mockReturnValue(false);
      await expect(terminalService.create(validTerminalInput)).rejects.toThrow(
        PermissionError,
      );
    });
  });

  describe("update", () => {
    it("更新成功", async () => {
      mockPrisma.paymentTerminal.findUnique.mockResolvedValue(
        samplePaymentTerminal,
      );
      mockPrisma.paymentTerminal.update.mockResolvedValue({
        ...samplePaymentTerminal,
        terminalName: "更新後の端末名",
      });

      const result = await terminalService.update("terminal-001", {
        ...validTerminalInput,
        terminalName: "更新後の端末名",
      });

      expect(result.terminalName).toBe("更新後の端末名");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "terminal.updated",
        expect.objectContaining({
          userId: adminUser.id,
        }),
      );
    });

    it("存在しない端末の更新時に NotFoundError を throw する", async () => {
      mockPrisma.paymentTerminal.findUnique.mockResolvedValue(null);

      await expect(
        terminalService.update("nonexistent", validTerminalInput),
      ).rejects.toThrow(NotFoundError);
    });

    it("シリアル番号重複時に ValidationError を throw する", async () => {
      mockPrisma.paymentTerminal.findUnique.mockResolvedValue(
        samplePaymentTerminal,
      );
      mockPrisma.paymentTerminal.update.mockRejectedValue({
        code: "P2002",
        meta: { target: ["serialNumber"] },
      });

      await expect(
        terminalService.update("terminal-001", validTerminalInput),
      ).rejects.toThrow("このシリアル番号は既に登録されています");
    });
  });

  describe("delete", () => {
    it("入金紐付けなしで削除成功", async () => {
      mockGetCurrentUser.mockResolvedValue(managerUser);
      mockPrisma.paymentTerminal.findUnique.mockResolvedValue({
        ...samplePaymentTerminal,
        _count: { payments: 0 },
      });
      mockPrisma.paymentTerminal.delete.mockResolvedValue(
        samplePaymentTerminal,
      );

      await terminalService.delete("terminal-001");

      expect(mockPrisma.paymentTerminal.delete).toHaveBeenCalledWith({
        where: { id: "terminal-001" },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "terminal.deleted",
        expect.objectContaining({
          userId: managerUser.id,
        }),
      );
    });

    it("入金紐付けあり時に ValidationError を throw する", async () => {
      mockPrisma.paymentTerminal.findUnique.mockResolvedValue({
        ...samplePaymentTerminal,
        _count: { payments: 5 },
      });

      await expect(terminalService.delete("terminal-001")).rejects.toThrow(
        "入金記録が紐付けられているため削除できません",
      );
    });

    it("MEMBER は PermissionError を throw する", async () => {
      mockGetCurrentUser.mockResolvedValue(memberUser);
      mockHasRole.mockReturnValue(false);

      await expect(terminalService.delete("terminal-001")).rejects.toThrow(
        PermissionError,
      );
    });

    it("存在しない端末の削除時に NotFoundError を throw する", async () => {
      mockPrisma.paymentTerminal.findUnique.mockResolvedValue(null);

      await expect(terminalService.delete("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("list", () => {
    it("ページネーション + フィルタで一覧取得", async () => {
      const terminals = [samplePaymentTerminal];
      mockPrisma.paymentTerminal.findMany.mockResolvedValue(terminals);
      mockPrisma.paymentTerminal.count.mockResolvedValue(1);

      const result = await terminalService.list({
        where: { status: "ACTIVE" },
        skip: 0,
        take: 50,
      });

      expect(result.data).toEqual(terminals);
      expect(result.total).toBe(1);
    });
  });

  describe("get", () => {
    it("正常取得", async () => {
      mockPrisma.paymentTerminal.findUnique.mockResolvedValue(
        samplePaymentTerminal,
      );

      const result = await terminalService.get("terminal-001");

      expect(result).toEqual(samplePaymentTerminal);
    });

    it("存在しない場合 NotFoundError を throw する", async () => {
      mockPrisma.paymentTerminal.findUnique.mockResolvedValue(null);

      await expect(terminalService.get("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
