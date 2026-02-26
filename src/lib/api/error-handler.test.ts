import { describe, it, expect } from "vitest";
import { handleApiError } from "./error-handler";
import { ValidationError, NotFoundError, PermissionError } from "@/lib/errors";

describe("handleApiError", () => {
  it("ValidationError → 400 + fieldErrors 付き", async () => {
    const fieldErrors = { name: ["必須です"] };
    const err = new ValidationError("検証エラー", fieldErrors);
    const res = handleApiError(err);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("検証エラー");
    expect(body.fieldErrors).toEqual(fieldErrors);
  });

  it("ValidationError（fieldErrors なし）→ 400", async () => {
    const err = new ValidationError("エラー");
    const res = handleApiError(err);
    expect(res.status).toBe(400);
  });

  it("NotFoundError → 404", async () => {
    const err = new NotFoundError("見つかりません");
    const res = handleApiError(err);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("見つかりません");
  });

  it("PermissionError → 403", async () => {
    const err = new PermissionError("権限がありません");
    const res = handleApiError(err);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("権限がありません");
  });

  it("通常の Error → 500（内部メッセージは隠蔽）", async () => {
    const err = new Error("内部エラー");
    const res = handleApiError(err);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("予期しないエラーが発生しました");
  });

  it("Error 以外 → 500（汎用メッセージ）", async () => {
    const res = handleApiError("文字列エラー");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("予期しないエラーが発生しました");
  });
});
