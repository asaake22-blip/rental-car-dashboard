/**
 * reservation-service のユニットテスト
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
  sampleReservation,
  validReservationInput,
  sampleVehicle,
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

const { reservationService } = await import(
  "@/lib/services/reservation-service"
);

describe("reservationService", () => {
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
      mockPrisma.reservation.findMany.mockResolvedValue([sampleReservation]);
      mockPrisma.reservation.count.mockResolvedValue(1);

      const result = await reservationService.list({});

      expect(result).toEqual({ data: [sampleReservation], total: 1 });
      expect(mockPrisma.reservation.findMany).toHaveBeenCalled();
      expect(mockPrisma.reservation.count).toHaveBeenCalled();
    });

    it("フィルタ・ページネーションパラメータを転送する", async () => {
      mockPrisma.reservation.findMany.mockResolvedValue([]);
      mockPrisma.reservation.count.mockResolvedValue(0);

      const where = { status: "RESERVED" as const };
      await reservationService.list({ where, skip: 10, take: 20 });

      expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where, skip: 10, take: 20 }),
      );
      expect(mockPrisma.reservation.count).toHaveBeenCalledWith({ where });
    });
  });

  // =================================================================
  // get
  // =================================================================
  describe("get", () => {
    it("IDで取得", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);

      const result = await reservationService.get("reservation-001");

      expect(result).toEqual(sampleReservation);
      expect(mockPrisma.reservation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "reservation-001" } }),
      );
    });

    it("存在しない場合 null を返す", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(null);

      const result = await reservationService.get("nonexistent");

      expect(result).toBeNull();
    });
  });

  // =================================================================
  // create
  // =================================================================
  describe("create", () => {
    it("RS-NNNNN 自動採番で作成", async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue({
        reservationCode: "RS-00005",
      });
      mockPrisma.reservation.create.mockResolvedValue({
        ...sampleReservation,
        reservationCode: "RS-00006",
      });

      const result = await reservationService.create(validReservationInput);

      expect(result.reservationCode).toBe("RS-00006");
      expect(mockPrisma.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reservationCode: "RS-00006",
          }),
        }),
      );
    });

    it("初回（既存なし）は RS-00001", async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      mockPrisma.reservation.create.mockResolvedValue({
        ...sampleReservation,
        reservationCode: "RS-00001",
      });

      await reservationService.create(validReservationInput);

      expect(mockPrisma.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reservationCode: "RS-00001",
          }),
        }),
      );
    });

    it("権限なし → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(
        reservationService.create(validReservationInput),
      ).rejects.toThrow(PermissionError);
    });

    it("バリデーション失敗（customerName 空）→ ValidationError", async () => {
      await expect(
        reservationService.create({
          ...validReservationInput,
          customerName: "",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("pickupDate >= returnDate → ValidationError", async () => {
      await expect(
        reservationService.create({
          ...validReservationInput,
          pickupDate: "2026-03-05T09:00:00",
          returnDate: "2026-03-03T18:00:00",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("unique 違反 → ValidationError", async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      mockPrisma.reservation.create.mockRejectedValue({
        code: "P2002",
        meta: { target: ["reservationCode"] },
      });

      await expect(
        reservationService.create(validReservationInput),
      ).rejects.toThrow(ValidationError);
    });

    it("イベント reservation.created が emit される", async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      const created = { ...sampleReservation, reservationCode: "RS-00001" };
      mockPrisma.reservation.create.mockResolvedValue(created);

      await reservationService.create(validReservationInput);

      expect(mockEventBus.emit).toHaveBeenCalledWith("reservation.created", {
        reservation: created,
        userId: adminUser.id,
      });
    });
  });

  // =================================================================
  // update
  // =================================================================
  describe("update", () => {
    it("RESERVED ステータスの予約を更新", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);
      const updated = { ...sampleReservation, customerName: "更新顧客" };
      mockPrisma.reservation.update.mockResolvedValue(updated);

      const result = await reservationService.update(
        "reservation-001",
        validReservationInput,
      );

      expect(result.customerName).toBe("更新顧客");
    });

    it("CONFIRMED ステータスの予約を更新", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...sampleReservation,
        status: "CONFIRMED",
      });
      mockPrisma.reservation.update.mockResolvedValue({
        ...sampleReservation,
        status: "CONFIRMED",
      });

      await expect(
        reservationService.update("reservation-001", validReservationInput),
      ).resolves.toBeDefined();
    });

    it("DEPARTED ステータスの予約は更新不可", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...sampleReservation,
        status: "DEPARTED",
      });

      await expect(
        reservationService.update("reservation-001", validReservationInput),
      ).rejects.toThrow(ValidationError);
    });

    it("予約が見つからない → NotFoundError", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(null);

      await expect(
        reservationService.update("nonexistent", validReservationInput),
      ).rejects.toThrow(NotFoundError);
    });

    it("権限なし → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(
        reservationService.update("reservation-001", validReservationInput),
      ).rejects.toThrow(PermissionError);
    });

    it("イベント reservation.updated が emit される", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);
      mockPrisma.reservation.update.mockResolvedValue(sampleReservation);

      await reservationService.update(
        "reservation-001",
        validReservationInput,
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith("reservation.updated", {
        reservation: sampleReservation,
        userId: adminUser.id,
      });
    });
  });

  // =================================================================
  // cancel
  // =================================================================
  describe("cancel", () => {
    it("RESERVED ステータスの予約をキャンセル", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);
      const cancelled = {
        ...sampleReservation,
        status: "CANCELLED",
        vehicleId: null,
      };
      mockPrisma.reservation.update.mockResolvedValue(cancelled);

      const result = await reservationService.cancel("reservation-001");

      expect(result.status).toBe("CANCELLED");
      expect(result.vehicleId).toBeNull();
      expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "CANCELLED",
            vehicleId: null,
          }),
        }),
      );
    });

    it("CONFIRMED ステータスの予約をキャンセル", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...sampleReservation,
        status: "CONFIRMED",
        vehicleId: "vehicle-001",
      });
      mockPrisma.reservation.update.mockResolvedValue({
        ...sampleReservation,
        status: "CANCELLED",
        vehicleId: null,
      });

      const result = await reservationService.cancel("reservation-001");

      expect(result.status).toBe("CANCELLED");
    });

    it("DEPARTED ステータスの予約はキャンセル不可", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...sampleReservation,
        status: "DEPARTED",
      });

      await expect(
        reservationService.cancel("reservation-001"),
      ).rejects.toThrow(ValidationError);
    });

    it("予約が見つからない → NotFoundError", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(null);

      await expect(
        reservationService.cancel("nonexistent"),
      ).rejects.toThrow(NotFoundError);
    });

    it("権限なし → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(
        reservationService.cancel("reservation-001"),
      ).rejects.toThrow(PermissionError);
    });

    it("イベント reservation.cancelled が emit される", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);
      const cancelled = {
        ...sampleReservation,
        status: "CANCELLED",
        vehicleId: null,
      };
      mockPrisma.reservation.update.mockResolvedValue(cancelled);

      await reservationService.cancel("reservation-001");

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "reservation.cancelled",
        {
          reservation: cancelled,
          userId: adminUser.id,
        },
      );
    });
  });

  // =================================================================
  // assignVehicle
  // =================================================================
  describe("assignVehicle", () => {
    const vehicleForAssign = {
      ...sampleVehicle,
      vehicleClassId: "vc-1",
    };

    it("RESERVED 予約に車両割当 → CONFIRMED", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);
      mockPrisma.vehicle.findUnique.mockResolvedValue(vehicleForAssign);
      mockPrisma.reservation.findFirst.mockResolvedValue(null); // no conflict
      const assigned = {
        ...sampleReservation,
        status: "CONFIRMED",
        vehicleId: "vehicle-001",
      };
      mockPrisma.reservation.update.mockResolvedValue(assigned);

      const result = await reservationService.assignVehicle(
        "reservation-001",
        "vehicle-001",
      );

      expect(result.status).toBe("CONFIRMED");
      expect(result.vehicleId).toBe("vehicle-001");
    });

    it("ステータスが RESERVED でない → ValidationError", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...sampleReservation,
        status: "CONFIRMED",
      });

      await expect(
        reservationService.assignVehicle("reservation-001", "vehicle-001"),
      ).rejects.toThrow(ValidationError);
    });

    it("車両が見つからない → NotFoundError", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);
      mockPrisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(
        reservationService.assignVehicle("reservation-001", "nonexistent"),
      ).rejects.toThrow(NotFoundError);
    });

    it("vehicleClassId 不一致 → ValidationError", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);
      mockPrisma.vehicle.findUnique.mockResolvedValue({
        ...vehicleForAssign,
        vehicleClassId: "vc-other",
      });

      await expect(
        reservationService.assignVehicle("reservation-001", "vehicle-001"),
      ).rejects.toThrow(ValidationError);
    });

    it("ダブルブッキング → ValidationError", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);
      mockPrisma.vehicle.findUnique.mockResolvedValue(vehicleForAssign);
      mockPrisma.reservation.findFirst.mockResolvedValue({
        ...sampleReservation,
        id: "reservation-002",
        reservationCode: "RS-00002",
      });

      await expect(
        reservationService.assignVehicle("reservation-001", "vehicle-001"),
      ).rejects.toThrow("RS-00002");
    });

    it("予約が見つからない → NotFoundError", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(null);

      await expect(
        reservationService.assignVehicle("nonexistent", "vehicle-001"),
      ).rejects.toThrow(NotFoundError);
    });

    it("権限なし → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(
        reservationService.assignVehicle("reservation-001", "vehicle-001"),
      ).rejects.toThrow(PermissionError);
    });

    it("イベント reservation.vehicleAssigned が emit される", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(sampleReservation);
      mockPrisma.vehicle.findUnique.mockResolvedValue(vehicleForAssign);
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      const assigned = {
        ...sampleReservation,
        status: "CONFIRMED",
        vehicleId: "vehicle-001",
      };
      mockPrisma.reservation.update.mockResolvedValue(assigned);

      await reservationService.assignVehicle("reservation-001", "vehicle-001");

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "reservation.vehicleAssigned",
        {
          reservation: assigned,
          userId: adminUser.id,
        },
      );
    });
  });

  // =================================================================
  // unassignVehicle
  // =================================================================
  describe("unassignVehicle", () => {
    it("CONFIRMED 予約の割当解除 → RESERVED", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...sampleReservation,
        status: "CONFIRMED",
        vehicleId: "vehicle-001",
      });
      const unassigned = {
        ...sampleReservation,
        status: "RESERVED",
        vehicleId: null,
      };
      mockPrisma.reservation.update.mockResolvedValue(unassigned);

      const result = await reservationService.unassignVehicle(
        "reservation-001",
      );

      expect(result.status).toBe("RESERVED");
      expect(result.vehicleId).toBeNull();
    });

    it("ステータスが CONFIRMED でない → ValidationError", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...sampleReservation,
        status: "DEPARTED",
      });

      await expect(
        reservationService.unassignVehicle("reservation-001"),
      ).rejects.toThrow(ValidationError);
    });

    it("予約が見つからない → NotFoundError", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(null);

      await expect(
        reservationService.unassignVehicle("nonexistent"),
      ).rejects.toThrow(NotFoundError);
    });

    it("権限なし → PermissionError", async () => {
      mockHasRole.mockReturnValue(false);

      await expect(
        reservationService.unassignVehicle("reservation-001"),
      ).rejects.toThrow(PermissionError);
    });
  });
});
