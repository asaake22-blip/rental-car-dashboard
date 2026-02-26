import { describe, it, expect } from "vitest";
import { parsePaginationParams } from "./types";

describe("parsePaginationParams", () => {
  it("デフォルト値（page=1, limit=50, skip=0）を返す", () => {
    const params = new URLSearchParams();
    const result = parsePaginationParams(params);
    expect(result).toEqual({ page: 1, limit: 50, skip: 0 });
  });

  it("page=3, limit=20 のとき skip=40 を計算する", () => {
    const params = new URLSearchParams({ page: "3", limit: "20" });
    const result = parsePaginationParams(params);
    expect(result).toEqual({ page: 3, limit: 20, skip: 40 });
  });

  it("page=0 を page=1 にクランプする", () => {
    const params = new URLSearchParams({ page: "0" });
    const result = parsePaginationParams(params);
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it("page=-5 を page=1 にクランプする", () => {
    const params = new URLSearchParams({ page: "-5" });
    const result = parsePaginationParams(params);
    expect(result.page).toBe(1);
  });

  it("limit=0 はデフォルト値(50)にフォールバックする", () => {
    // Number("0") は 0（falsy）なので || 50 でデフォルト値になる
    const params = new URLSearchParams({ limit: "0" });
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(50);
  });

  it("limit=200 を limit=100 にクランプする", () => {
    const params = new URLSearchParams({ limit: "200" });
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(100);
  });

  it("数値以外の文字列ではデフォルト値を使用する", () => {
    const params = new URLSearchParams({ page: "abc", limit: "xyz" });
    const result = parsePaginationParams(params);
    expect(result).toEqual({ page: 1, limit: 50, skip: 0 });
  });
});
