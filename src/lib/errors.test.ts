import { describe, it, expect } from "vitest";
import { ValidationError, NotFoundError, PermissionError } from "./errors";

describe("ValidationError", () => {
  it("Error を継承している", () => {
    const err = new ValidationError("テスト");
    expect(err).toBeInstanceOf(Error);
  });

  it("name が ValidationError", () => {
    const err = new ValidationError("テスト");
    expect(err.name).toBe("ValidationError");
  });

  it("message が設定される", () => {
    const err = new ValidationError("入力内容に誤りがあります");
    expect(err.message).toBe("入力内容に誤りがあります");
  });

  it("fieldErrors が設定される", () => {
    const fieldErrors = { name: ["必須です"], email: ["形式が不正です"] };
    const err = new ValidationError("バリデーションエラー", fieldErrors);
    expect(err.fieldErrors).toEqual(fieldErrors);
  });

  it("fieldErrors が省略可能", () => {
    const err = new ValidationError("エラー");
    expect(err.fieldErrors).toBeUndefined();
  });
});

describe("NotFoundError", () => {
  it("Error を継承している", () => {
    const err = new NotFoundError("見つかりません");
    expect(err).toBeInstanceOf(Error);
  });

  it("name が NotFoundError", () => {
    const err = new NotFoundError("見つかりません");
    expect(err.name).toBe("NotFoundError");
  });
});

describe("PermissionError", () => {
  it("Error を継承している", () => {
    const err = new PermissionError("権限がありません");
    expect(err).toBeInstanceOf(Error);
  });

  it("name が PermissionError", () => {
    const err = new PermissionError("権限がありません");
    expect(err.name).toBe("PermissionError");
  });
});
