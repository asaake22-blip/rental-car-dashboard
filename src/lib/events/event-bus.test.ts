import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/generated/prisma/client", () => ({}));

import { EventBus } from "./event-bus";
import { sampleReservation } from "@/__tests__/helpers/fixtures";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("登録したハンドラーが emit で呼び出される", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    bus.on("reservation.created", handler);

    const payload = { reservation: sampleReservation, userId: "user-1" } as any;
    await bus.emit("reservation.created", payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it("同一イベントに複数ハンドラーを登録すると全て呼び出される", async () => {
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockResolvedValue(undefined);
    bus.on("reservation.created", handler1);
    bus.on("reservation.created", handler2);

    await bus.emit("reservation.created", { reservation: sampleReservation, userId: "u1" } as any);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("未登録イベントの emit で例外が発生しない", async () => {
    await expect(
      bus.emit("vehicle.deleted", { id: "xxx", userId: "u1" }),
    ).resolves.toBeUndefined();
  });

  it("ハンドラーが throw しても他のハンドラーは実行される", async () => {
    const errorHandler = vi.fn().mockRejectedValue(new Error("fail"));
    const successHandler = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    bus.on("reservation.created", errorHandler);
    bus.on("reservation.created", successHandler);

    await bus.emit("reservation.created", { reservation: sampleReservation, userId: "u1" } as any);

    expect(errorHandler).toHaveBeenCalled();
    expect(successHandler).toHaveBeenCalled();
  });

  it("ハンドラーエラー時に console.error が呼ばれる", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorHandler = vi.fn().mockRejectedValue(new Error("test error"));

    bus.on("reservation.created", errorHandler);
    await bus.emit("reservation.created", { reservation: sampleReservation, userId: "u1" } as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("reservation.created"),
      expect.any(Error),
    );
  });

  it("payload がハンドラーに正しく渡される", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    bus.on("vehicle.deleted", handler);

    const payload = { id: "vehicle-123", userId: "user-456" };
    await bus.emit("vehicle.deleted", payload);

    expect(handler).toHaveBeenCalledWith(payload);
  });
});
