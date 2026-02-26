import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  adminUser,
  memberUser,
  sampleReservation,
} from "@/__tests__/helpers/fixtures";
import { mockPrisma, mockGetCurrentUser, mockHasRole, mockEventBus } from "@/__tests__/helpers/setup";
import type { CurrentUser } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mockGetCurrentUser, hasRole: mockHasRole }));
vi.mock("@/lib/events/event-bus", () => ({ eventBus: mockEventBus }));
vi.mock("@/lib/events/handlers", () => ({}));
vi.mock("@/generated/prisma/client", () => ({}));

import { approvalService } from "./approval-service";
import { PermissionError, ValidationError } from "@/lib/errors";

describe("approvalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    mockHasRole.mockImplementation((user: CurrentUser, role: string) => {
      const h: Record<string, number> = { ADMIN: 3, MANAGER: 2, MEMBER: 1 };
      return h[user.role] >= h[role];
    });
  });

  describe("getPendingCounts", () => {
    it("未承認予約件数を取得する", async () => {
      mockPrisma.reservation.count.mockResolvedValue(7);

      const result = await approvalService.getPendingCounts();

      expect(result).toEqual({ reservations: 7 });
      expect(mockPrisma.reservation.count).toHaveBeenCalledWith({
        where: { approvalStatus: "PENDING" },
      });
    });
  });

  describe("listPendingReservations", () => {
    it("承認待ち予約一覧を取得する", async () => {
      const pendingReservation = { ...sampleReservation, approvalStatus: "PENDING" };
      mockPrisma.reservation.findMany.mockResolvedValue([pendingReservation]);
      mockPrisma.reservation.count.mockResolvedValue(1);

      const result = await approvalService.listPendingReservations({
        skip: 0,
        take: 10,
      });

      expect(result.data).toEqual([pendingReservation]);
      expect(result.total).toBe(1);
      expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ approvalStatus: "PENDING" }),
          include: { vehicleClass: true, pickupOffice: true },
        }),
      );
    });
  });

  describe("approve", () => {
    it("PENDING の予約を承認する（reservation-service に委譲）", async () => {
      const pendingReservation = { ...sampleReservation, approvalStatus: "PENDING" };
      mockPrisma.reservation.findUnique.mockResolvedValue(pendingReservation);
      const approvedReservation = { ...sampleReservation, approvalStatus: "APPROVED" };
      mockPrisma.reservation.update.mockResolvedValue(approvedReservation);

      const result = await approvalService.approve("reservation-001", {
        status: "APPROVED",
        comment: "承認します",
      });

      expect(result.approvalStatus).toBe("APPROVED");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "reservation.approved",
        expect.objectContaining({ reservation: approvedReservation }),
      );
    });

    it("PENDING の予約を却下する", async () => {
      const pendingReservation = { ...sampleReservation, approvalStatus: "PENDING" };
      mockPrisma.reservation.findUnique.mockResolvedValue(pendingReservation);
      const rejectedReservation = { ...sampleReservation, approvalStatus: "REJECTED" };
      mockPrisma.reservation.update.mockResolvedValue(rejectedReservation);

      const result = await approvalService.approve("reservation-001", {
        status: "REJECTED",
        comment: "却下します",
      });

      expect(result.approvalStatus).toBe("REJECTED");
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "reservation.rejected",
        expect.any(Object),
      );
    });

    it("MEMBER は PermissionError", async () => {
      mockGetCurrentUser.mockResolvedValue(memberUser);
      await expect(
        approvalService.approve("reservation-001", { status: "APPROVED" }),
      ).rejects.toThrow(PermissionError);
    });
  });

  describe("bulkApprove", () => {
    it("正常な一括承認で updateMany を呼ぶ", async () => {
      mockPrisma.reservation.updateMany.mockResolvedValue({ count: 3 });
      const updatedReservations = [
        { ...sampleReservation, id: "r1", approvalStatus: "APPROVED" },
        { ...sampleReservation, id: "r2", approvalStatus: "APPROVED" },
        { ...sampleReservation, id: "r3", approvalStatus: "APPROVED" },
      ];
      mockPrisma.reservation.findMany.mockResolvedValue(updatedReservations);

      const result = await approvalService.bulkApprove({
        ids: ["r1", "r2", "r3"],
        status: "APPROVED",
      });

      expect(result).toEqual({ count: 3 });
      expect(mockPrisma.reservation.updateMany).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledTimes(3);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "reservation.approved",
        expect.objectContaining({ reservation: updatedReservations[0] }),
      );
    });

    it("MEMBER は PermissionError", async () => {
      mockGetCurrentUser.mockResolvedValue(memberUser);
      await expect(
        approvalService.bulkApprove({ ids: ["r1"], status: "APPROVED" }),
      ).rejects.toThrow(PermissionError);
    });

    it("ids 空配列で ValidationError", async () => {
      await expect(
        approvalService.bulkApprove({ ids: [], status: "APPROVED" }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
