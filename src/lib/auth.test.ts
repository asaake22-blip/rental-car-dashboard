import { describe, it, expect } from "vitest";
import { getCurrentUser, hasRole, type CurrentUser } from "./auth";

describe("getCurrentUser", () => {
  it("スタブユーザー（ADMIN）を返す", async () => {
    const user = await getCurrentUser();
    expect(user.role).toBe("ADMIN");
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
  });
});

describe("hasRole", () => {
  const admin: CurrentUser = { id: "1", email: "a@test.com", name: "Admin", role: "ADMIN" };
  const manager: CurrentUser = { id: "2", email: "m@test.com", name: "Manager", role: "MANAGER" };
  const member: CurrentUser = { id: "3", email: "u@test.com", name: "Member", role: "MEMBER" };

  it("ADMIN は MEMBER 以上 → true", () => {
    expect(hasRole(admin, "MEMBER")).toBe(true);
  });

  it("ADMIN は MANAGER 以上 → true", () => {
    expect(hasRole(admin, "MANAGER")).toBe(true);
  });

  it("ADMIN は ADMIN 以上 → true", () => {
    expect(hasRole(admin, "ADMIN")).toBe(true);
  });

  it("MANAGER は MEMBER 以上 → true", () => {
    expect(hasRole(manager, "MEMBER")).toBe(true);
  });

  it("MANAGER は MANAGER 以上 → true", () => {
    expect(hasRole(manager, "MANAGER")).toBe(true);
  });

  it("MANAGER は ADMIN 以上 → false", () => {
    expect(hasRole(manager, "ADMIN")).toBe(false);
  });

  it("MEMBER は MEMBER 以上 → true", () => {
    expect(hasRole(member, "MEMBER")).toBe(true);
  });

  it("MEMBER は MANAGER 以上 → false", () => {
    expect(hasRole(member, "MANAGER")).toBe(false);
  });

  it("MEMBER は ADMIN 以上 → false", () => {
    expect(hasRole(member, "ADMIN")).toBe(false);
  });
});
