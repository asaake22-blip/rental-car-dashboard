import { describe, it, expect, vi, afterEach } from "vitest";
import { sendSlackMessage } from "./client";

describe("sendSlackMessage", () => {
  const originalUrl = process.env.SLACK_WEBHOOK_URL;

  afterEach(() => {
    if (originalUrl !== undefined) {
      process.env.SLACK_WEBHOOK_URL = originalUrl;
    } else {
      delete process.env.SLACK_WEBHOOK_URL;
    }
    vi.restoreAllMocks();
  });

  it("SLACK_WEBHOOK_URL 未設定時はスキップして true を返す", async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await sendSlackMessage({ text: "test" });
    expect(result).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("正常送信時は true を返す", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));

    const result = await sendSlackMessage({ text: "hello" });
    expect(result).toBe(true);
  });

  it("正しい URL に POST リクエストを送信する", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));

    await sendSlackMessage({ text: "hello" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
    );
  });

  it("fetch が 500 を返した場合 false を返す", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("error", { status: 500, statusText: "Internal Server Error" }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendSlackMessage({ text: "hello" });
    expect(result).toBe(false);
  });

  it("fetch が throw した場合 false を返す", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendSlackMessage({ text: "hello" });
    expect(result).toBe(false);
  });
});
