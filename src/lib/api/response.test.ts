import { describe, it, expect } from "vitest";
import { apiSuccess, apiError, apiPaginated } from "./response";

describe("apiSuccess", () => {
  it("デフォルトで 200 ステータスを返す", () => {
    const res = apiSuccess({ id: "1" });
    expect(res.status).toBe(200);
  });

  it("{ success: true, data } 形式のボディを返す", async () => {
    const res = apiSuccess({ id: "1", name: "test" });
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { id: "1", name: "test" } });
  });

  it("カスタムステータス(201)を渡せる", () => {
    const res = apiSuccess({ id: "1" }, 201);
    expect(res.status).toBe(201);
  });
});

describe("apiError", () => {
  it("デフォルトで 400 ステータスを返す", () => {
    const res = apiError("エラー");
    expect(res.status).toBe(400);
  });

  it("{ success: false, error } 形式のボディを返す", async () => {
    const res = apiError("入力エラー");
    const body = await res.json();
    expect(body).toEqual({ success: false, error: "入力エラー" });
  });

  it("カスタムステータス(404)を渡せる", () => {
    const res = apiError("見つかりません", 404);
    expect(res.status).toBe(404);
  });

  it("fieldErrors を含められる", async () => {
    const fieldErrors = { name: ["必須です"] };
    const res = apiError("バリデーションエラー", 400, fieldErrors);
    const body = await res.json();
    expect(body.fieldErrors).toEqual(fieldErrors);
  });

  it("fieldErrors 省略時はレスポンスに含まない", async () => {
    const res = apiError("エラー");
    const body = await res.json();
    expect(body).not.toHaveProperty("fieldErrors");
  });
});

describe("apiPaginated", () => {
  it("200 ステータスを返す", () => {
    const res = apiPaginated([], { page: 1, limit: 50, total: 0, totalPages: 0 });
    expect(res.status).toBe(200);
  });

  it("{ success: true, data, pagination } 形式のボディを返す", async () => {
    const data = [{ id: "1" }, { id: "2" }];
    const pagination = { page: 1, limit: 50, total: 2, totalPages: 1 };
    const res = apiPaginated(data, pagination);
    const body = await res.json();
    expect(body).toEqual({ success: true, data, pagination });
  });
});
