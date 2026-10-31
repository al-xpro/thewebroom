import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createMember, setup } from "./setup";

describe("admin check", () => {
  test("only the configured admin is an admin", async () => {
    const t = setup();
    const admin = await createMember(t, { email: "admin@example.com" });
    const member = await createMember(t, { email: "someone@example.com" });
    expect(await admin.as.query(api.auth.getIsAdmin, {})).toBe(true);
    expect(await member.as.query(api.auth.getIsAdmin, {})).toBe(false);
    expect(await t.query(api.auth.getIsAdmin, {})).toBe(false);
  });
});
