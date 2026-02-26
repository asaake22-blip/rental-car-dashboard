import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { authenticateApiRequest, withAuth } from "./auth";

function createRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", { headers });
}

describe("authenticateApiRequest", () => {
  const originalApiKey = process.env.API_KEY;

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.API_KEY = originalApiKey;
    } else {
      delete process.env.API_KEY;
    }
  });

  it("API_KEY 未設定時は認証をスキップする", () => {
    delete process.env.API_KEY;
    const req = createRequest();
    const ctx = authenticateApiRequest(req);
    expect(ctx).toEqual({ userId: "api-user", apiKey: "" });
  });

  it("Authorization ヘッダーなし → null", () => {
    process.env.API_KEY = "secret";
    const req = createRequest();
    const ctx = authenticateApiRequest(req);
    expect(ctx).toBeNull();
  });

  it("Bearer 以外の形式 → null", () => {
    process.env.API_KEY = "secret";
    const req = createRequest({ authorization: "Basic abc123" });
    const ctx = authenticateApiRequest(req);
    expect(ctx).toBeNull();
  });

  it("トークン不一致 → null", () => {
    process.env.API_KEY = "secret";
    const req = createRequest({ authorization: "Bearer wrong-key" });
    const ctx = authenticateApiRequest(req);
    expect(ctx).toBeNull();
  });

  it("トークン一致 → ApiContext を返す", () => {
    process.env.API_KEY = "secret";
    const req = createRequest({ authorization: "Bearer secret" });
    const ctx = authenticateApiRequest(req);
    expect(ctx).toEqual({ userId: "api-user", apiKey: "secret" });
  });
});

describe("withAuth", () => {
  const originalApiKey = process.env.API_KEY;

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.API_KEY = originalApiKey;
    } else {
      delete process.env.API_KEY;
    }
  });

  it("認証成功時にハンドラーが呼ばれる", async () => {
    process.env.API_KEY = "test-key";
    const handler = vi.fn().mockResolvedValue(new Response("OK"));
    const wrapped = withAuth(handler);

    const req = createRequest({ authorization: "Bearer test-key" });
    await wrapped(req);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][1]).toEqual({ userId: "api-user", apiKey: "test-key" });
  });

  it("認証失敗時に 401 レスポンスを返す", async () => {
    process.env.API_KEY = "test-key";
    const handler = vi.fn();
    const wrapped = withAuth(handler);

    const req = createRequest();
    const res = await wrapped(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("認証が必要です");
    expect(handler).not.toHaveBeenCalled();
  });
});
