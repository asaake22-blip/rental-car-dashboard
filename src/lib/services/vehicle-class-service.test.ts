import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  adminUser,
  managerUser,
  memberUser,
  sampleVehicleClass,
  validVehicleClassInput,
} from "@/__tests__/helpers/fixtures";
import { mockPrisma, mockGetCurrentUser, mockHasRole, mockEventBus } from "@/__tests__/helpers/setup";
import type { CurrentUser } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mockGetCurrentUser, hasRole: mockHasRole }));
vi.mock("@/lib/events/event-bus", () => ({ eventBus: mockEventBus }));
vi.mock("@/lib/events/handlers", () => ({}));
vi.mock("@/generated/prisma/client", () => ({}));

import { vehicleClassService } from "./vehicle-class-service";
import { ValidationError, NotFoundError, PermissionError } from "@/lib/errors";

describe("vehicleClassService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    mockHasRole.mockImplementation((user: CurrentUser, role: string) => {
      const h: Record<string, number> = { ADMIN: 3, MANAGER: 2, MEMBER: 1 };
      return h[user.role] >= h[role];
    });
  });

  describe("list", () => {
    it("車両クラス一覧を sortOrder 昇順で取得する", async () => {
      const classes = [
        { ...sampleVehicleClass, sortOrder: 1, _count: { vehicles: 5 } },
        { ...sampleVehicleClass, id: "vc-2", sortOrder: 2, _count: { vehicles: 3 } },
      ];
      mockPrisma.vehicleClass.findMany.mockResolvedValue(classes);
      mockPrisma.vehicleClass.count.mockResolvedValue(2);

      const result = await vehicleClassService.list({
        orderBy: { sortOrder: "asc" },
        skip: 0,
        take: 10,
      });

      expect(result.data).toEqual(classes);
      expect(result.total).toBe(2);
      expect(mockPrisma.vehicleClass.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { sortOrder: "asc" },
        skip: 0,
        take: 10,
        include: {
          _count: { select: { vehicles: true } },
        },
      });
      expect(mockPrisma.vehicleClass.count).toHaveBeenCalledWith({
        where: undefined,
      });
    });
  });

  describe("get", () => {
    it("ID で車両クラスを取得する", async () => {
      const classWithCount = {
        ...sampleVehicleClass,
        _count: { vehicles: 10, ratePlans: 3, reservations: 5 },
      };
      mockPrisma.vehicleClass.findUnique.mockResolvedValue(classWithCount);

      const result = await vehicleClassService.get("vc-1");

      expect(result).toEqual(classWithCount);
      expect(mockPrisma.vehicleClass.findUnique).toHaveBeenCalledWith({
        where: { id: "vc-1" },
        include: {
          _count: { select: { vehicles: true, ratePlans: true, reservations: true } },
        },
      });
    });

    it("存在しない ID の場合 null を返す", async () => {
      mockPrisma.vehicleClass.findUnique.mockResolvedValue(null);

      const result = await vehicleClassService.get("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("有効な入力で VehicleClass を作成する（CL-NNNNN 自動採番）", async () => {
      mockPrisma.vehicleClass.findFirst.mockResolvedValue({
        classCode: "CL-00005",
      });
      const created = {
        ...sampleVehicleClass,
        classCode: "CL-00006",
        className: validVehicleClassInput.className,
      };
      mockPrisma.vehicleClass.create.mockResolvedValue(created);

      const result = await vehicleClassService.create(validVehicleClassInput);

      expect(result).toEqual(created);
      expect(mockPrisma.vehicleClass.findFirst).toHaveBeenCalledWith({
        orderBy: { classCode: "desc" },
        select: { classCode: true },
      });
      expect(mockPrisma.vehicleClass.create).toHaveBeenCalledWith({
        data: {
          classCode: "CL-00006",
          className: validVehicleClassInput.className,
          description: validVehicleClassInput.description,
          sortOrder: validVehicleClassInput.sortOrder,
        },
      });
    });

    it("初回作成時は CL-00001 から開始する", async () => {
      mockPrisma.vehicleClass.findFirst.mockResolvedValue(null);
      const created = {
        ...sampleVehicleClass,
        classCode: "CL-00001",
        className: validVehicleClassInput.className,
      };
      mockPrisma.vehicleClass.create.mockResolvedValue(created);

      const result = await vehicleClassService.create(validVehicleClassInput);

      expect(result.classCode).toBe("CL-00001");
    });

    it("バリデーション失敗時に ValidationError を throw する（className 未入力）", async () => {
      const invalidInput = { ...validVehicleClassInput, className: "" };
      await expect(vehicleClassService.create(invalidInput)).rejects.toThrow(ValidationError);
    });

    it("バリデーション失敗時に fieldErrors を含む", async () => {
      const invalidInput = { ...validVehicleClassInput, className: "" };
      try {
        await vehicleClassService.create(invalidInput);
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).fieldErrors).toBeDefined();
        expect((e as ValidationError).fieldErrors!["className"]).toBeDefined();
      }
    });

    it("権限不足時に PermissionError を throw する", async () => {
      mockHasRole.mockReturnValue(false);
      await expect(vehicleClassService.create(validVehicleClassInput)).rejects.toThrow(PermissionError);
    });

    it("P2002 エラー（className 重複）を ValidationError に変換する", async () => {
      mockPrisma.vehicleClass.findFirst.mockResolvedValue(null);
      mockPrisma.vehicleClass.create.mockRejectedValue({
        code: "P2002",
        meta: { target: ["className"] },
      });

      await expect(vehicleClassService.create(validVehicleClassInput)).rejects.toThrow(
        "このクラス名は既に登録されています",
      );
    });
  });

  describe("update", () => {
    it("有効な入力で VehicleClass を更新する", async () => {
      const existing = { ...sampleVehicleClass };
      const updated = { ...sampleVehicleClass, className: "更新後クラス名" };

      mockPrisma.vehicleClass.findUnique.mockResolvedValue(existing);
      mockPrisma.vehicleClass.update.mockResolvedValue(updated);

      const result = await vehicleClassService.update("vc-1", {
        className: "更新後クラス名",
        sortOrder: 1,
      });

      expect(result).toEqual(updated);
      expect(mockPrisma.vehicleClass.update).toHaveBeenCalledWith({
        where: { id: "vc-1" },
        data: {
          className: "更新後クラス名",
          description: null,
          sortOrder: 1,
        },
      });
    });

    it("存在しない ID の場合 NotFoundError を throw する", async () => {
      mockPrisma.vehicleClass.findUnique.mockResolvedValue(null);

      await expect(vehicleClassService.update("nonexistent", validVehicleClassInput)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("P2002 エラー（className 重複）を ValidationError に変換する", async () => {
      mockPrisma.vehicleClass.findUnique.mockResolvedValue(sampleVehicleClass);
      mockPrisma.vehicleClass.update.mockRejectedValue({
        code: "P2002",
        meta: { target: ["className"] },
      });

      await expect(vehicleClassService.update("vc-1", validVehicleClassInput)).rejects.toThrow(
        "このクラス名は既に登録されています",
      );
    });

    it("権限不足時に PermissionError を throw する", async () => {
      mockHasRole.mockReturnValue(false);
      await expect(vehicleClassService.update("vc-1", validVehicleClassInput)).rejects.toThrow(PermissionError);
    });
  });

  describe("delete", () => {
    it("MANAGER 以上で削除できる", async () => {
      mockGetCurrentUser.mockResolvedValue(managerUser);
      mockPrisma.vehicleClass.findUnique.mockResolvedValue({
        ...sampleVehicleClass,
        _count: { vehicles: 0, ratePlans: 0, reservations: 0 },
      });
      mockPrisma.vehicleClass.delete.mockResolvedValue(undefined);

      await expect(vehicleClassService.delete("vc-1")).resolves.toBeUndefined();
      expect(mockPrisma.vehicleClass.delete).toHaveBeenCalledWith({ where: { id: "vc-1" } });
    });

    it("MEMBER は PermissionError", async () => {
      mockGetCurrentUser.mockResolvedValue(memberUser);
      await expect(vehicleClassService.delete("vc-1")).rejects.toThrow(PermissionError);
    });

    it("存在しない ID の場合 NotFoundError を throw する", async () => {
      mockGetCurrentUser.mockResolvedValue(managerUser);
      mockPrisma.vehicleClass.findUnique.mockResolvedValue(null);

      await expect(vehicleClassService.delete("nonexistent")).rejects.toThrow(NotFoundError);
    });

    it("関連車両がある場合は削除不可", async () => {
      mockGetCurrentUser.mockResolvedValue(managerUser);
      mockPrisma.vehicleClass.findUnique.mockResolvedValue({
        ...sampleVehicleClass,
        _count: { vehicles: 5, ratePlans: 0, reservations: 0 },
      });

      await expect(vehicleClassService.delete("vc-1")).rejects.toThrow(
        "この車両クラスには 5 台の車両が紐づいているため削除できません",
      );
    });

    it("関連料金プランがある場合は削除不可", async () => {
      mockGetCurrentUser.mockResolvedValue(managerUser);
      mockPrisma.vehicleClass.findUnique.mockResolvedValue({
        ...sampleVehicleClass,
        _count: { vehicles: 0, ratePlans: 3, reservations: 0 },
      });

      await expect(vehicleClassService.delete("vc-1")).rejects.toThrow(
        "この車両クラスには 3 件の料金プランが紐づいているため削除できません",
      );
    });

    it("関連予約がある場合は削除不可", async () => {
      mockGetCurrentUser.mockResolvedValue(managerUser);
      mockPrisma.vehicleClass.findUnique.mockResolvedValue({
        ...sampleVehicleClass,
        _count: { vehicles: 0, ratePlans: 0, reservations: 2 },
      });

      await expect(vehicleClassService.delete("vc-1")).rejects.toThrow(
        "この車両クラスには 2 件の予約が紐づいているため削除できません",
      );
    });
  });
});
