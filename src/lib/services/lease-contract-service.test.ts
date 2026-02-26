import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  adminUser,
  memberUser,
  sampleLeaseContract,
  sampleVehicle,
  sampleLeaseContractLine,
  validLeaseContractInput,
  validLeaseLineInput,
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

import { leaseContractService } from "./lease-contract-service";
import { ValidationError, PermissionError, NotFoundError } from "@/lib/errors";

describe("leaseContractService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    mockHasRole.mockImplementation((user: CurrentUser, role: string) => {
      const h: Record<string, number> = { ADMIN: 3, MANAGER: 2, MEMBER: 1 };
      return h[user.role] >= h[role];
    });
  });

  describe("create", () => {
    it("有効な入力で LeaseContract を作成する", async () => {
      // 自動採番用のlast契約
      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        // トランザクション内での呼び出しをシミュレート
        const tx = {
          leaseContract: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              ...sampleLeaseContract,
              contractNumber: "LC-00001",
            }),
          },
          vehicle: {
            findMany: vi.fn().mockResolvedValue([
              { ...sampleVehicle, status: "IN_STOCK" },
            ]),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return fn(tx);
      });

      const result = await leaseContractService.create(validLeaseContractInput);

      expect(result.contractNumber).toBe("LC-00001");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "lease.created",
        expect.objectContaining({
          userId: adminUser.id,
        }),
      );
    });

    it("バリデーション失敗時に ValidationError を throw する", async () => {
      const invalidInput = { ...validLeaseContractInput, lesseeName: "" };
      await expect(
        leaseContractService.create(invalidInput),
      ).rejects.toThrow(ValidationError);
    });

    it("権限不足時に PermissionError を throw する", async () => {
      mockHasRole.mockReturnValue(false);
      await expect(
        leaseContractService.create(validLeaseContractInput),
      ).rejects.toThrow(PermissionError);
    });

    it("車両が IN_STOCK でない場合 ValidationError を throw する", async () => {
      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          leaseContract: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
          vehicle: {
            findMany: vi.fn().mockResolvedValue([
              { ...sampleVehicle, status: "LEASED" },
            ]),
          },
        };
        return fn(tx);
      });

      await expect(
        leaseContractService.create(validLeaseContractInput),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("update", () => {
    it("有効な入力で LeaseContract を更新する", async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue(
        sampleLeaseContract,
      );
      const updated = { ...sampleLeaseContract, lesseeName: "更新リース会社" };
      mockPrisma.leaseContract.update.mockResolvedValue(updated);

      const result = await leaseContractService.update(
        "lease-001",
        validLeaseContractInput,
      );

      expect(result).toEqual(updated);
    });

    it("契約が存在しない場合 NotFoundError を throw する", async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue(null);

      await expect(
        leaseContractService.update("nonexistent", validLeaseContractInput),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("MANAGER 以上で削除できる", async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue({
        ...sampleLeaseContract,
        lines: [{ vehicleId: "vehicle-001" }],
      });

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          leaseContract: {
            delete: vi.fn().mockResolvedValue(undefined),
          },
          leaseContractLine: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          vehicle: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return fn(tx);
      });

      await expect(
        leaseContractService.delete("lease-001"),
      ).resolves.toBeUndefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "lease.terminated",
        expect.objectContaining({
          userId: adminUser.id,
        }),
      );
    });

    it("MEMBER は PermissionError", async () => {
      mockGetCurrentUser.mockResolvedValue(memberUser);
      await expect(leaseContractService.delete("lease-001")).rejects.toThrow(
        PermissionError,
      );
    });
  });

  describe("terminate", () => {
    it("ACTIVE 契約を解約できる", async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue({
        ...sampleLeaseContract,
        status: "ACTIVE",
        lines: [{ vehicleId: "vehicle-001" }],
      });

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          leaseContract: {
            update: vi
              .fn()
              .mockResolvedValue({ ...sampleLeaseContract, status: "TERMINATED" }),
          },
          leaseContractLine: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          vehicle: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return fn(tx);
      });

      const result = await leaseContractService.terminate("lease-001");

      expect(result.status).toBe("TERMINATED");
      expect(mockEventBus.emit).toHaveBeenCalledWith("lease.terminated", {
        lease: result,
        userId: adminUser.id,
      });
    });

    it("ACTIVE でない契約は解約できない", async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue({
        ...sampleLeaseContract,
        status: "TERMINATED",
        lines: [],
      });

      await expect(
        leaseContractService.terminate("lease-001"),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("addLine", () => {
    it("有効な入力で明細を追加する", async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue({
        ...sampleLeaseContract,
        status: "ACTIVE",
      });

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          vehicle: {
            findUnique: vi.fn().mockResolvedValue({
              ...sampleVehicle,
              status: "IN_STOCK",
            }),
            update: vi.fn().mockResolvedValue({
              ...sampleVehicle,
              status: "LEASED",
            }),
          },
          leaseContractLine: {
            create: vi.fn().mockResolvedValue(sampleLeaseContractLine),
          },
        };
        return fn(tx);
      });

      const result = await leaseContractService.addLine(
        "lease-001",
        validLeaseLineInput,
      );

      expect(result).toEqual(sampleLeaseContractLine);
    });

    it("車両が IN_STOCK でない場合 ValidationError を throw する", async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue({
        ...sampleLeaseContract,
        status: "ACTIVE",
      });

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          vehicle: {
            findUnique: vi.fn().mockResolvedValue({
              ...sampleVehicle,
              status: "LEASED",
            }),
          },
        };
        return fn(tx);
      });

      await expect(
        leaseContractService.addLine("lease-001", validLeaseLineInput),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("removeLine", () => {
    it("明細を削除する", async () => {
      mockPrisma.leaseContractLine.findUnique.mockResolvedValue({
        ...sampleLeaseContractLine,
        contract: { ...sampleLeaseContract, status: "ACTIVE" },
      });

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          leaseContractLine: {
            delete: vi.fn().mockResolvedValue(undefined),
            findFirst: vi.fn().mockResolvedValue(null),
          },
          vehicle: {
            update: vi.fn().mockResolvedValue({
              ...sampleVehicle,
              status: "IN_STOCK",
            }),
          },
        };
        return fn(tx);
      });

      await expect(
        leaseContractService.removeLine("line-001"),
      ).resolves.toBeUndefined();
    });

    it("明細が存在しない場合 NotFoundError を throw する", async () => {
      mockPrisma.leaseContractLine.findUnique.mockResolvedValue(null);

      await expect(
        leaseContractService.removeLine("nonexistent"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("list", () => {
    it("契約一覧を取得する", async () => {
      mockPrisma.leaseContract.findMany.mockResolvedValue([
        sampleLeaseContract,
      ]);
      mockPrisma.leaseContract.count.mockResolvedValue(1);

      const result = await leaseContractService.list({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        skip: 0,
        take: 10,
      });

      expect(result.data).toEqual([sampleLeaseContract]);
      expect(result.total).toBe(1);
    });
  });

  describe("get", () => {
    it("ID で契約を取得する", async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue(
        sampleLeaseContract,
      );

      const result = await leaseContractService.get("lease-001");

      expect(result).toEqual(sampleLeaseContract);
    });

    it("存在しない ID の場合 null を返す", async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue(null);

      const result = await leaseContractService.get("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("listByVehicle", () => {
    it("車両別の契約明細一覧を取得する", async () => {
      mockPrisma.leaseContractLine.findMany.mockResolvedValue([
        sampleLeaseContractLine,
      ]);

      const result = await leaseContractService.listByVehicle("vehicle-001");

      expect(result).toEqual([sampleLeaseContractLine]);
    });
  });

  describe("expireOverdue", () => {
    it("期限切れ契約のステータスを EXPIRED に更新する", async () => {
      mockPrisma.leaseContract.findMany.mockResolvedValue([
        {
          ...sampleLeaseContract,
          endDate: new Date("2024-03-31"),
          lines: [{ vehicleId: "vehicle-001" }],
        },
      ]);

      (mockPrisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          leaseContract: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          leaseContractLine: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          vehicle: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return fn(tx);
      });

      const result = await leaseContractService.expireOverdue();

      expect(result).toBe(1);
    });

    it("期限切れ契約がない場合 0 を返す", async () => {
      mockPrisma.leaseContract.findMany.mockResolvedValue([]);

      const result = await leaseContractService.expireOverdue();

      expect(result).toBe(0);
    });
  });
});
