import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { createMember, setup } from "./setup";

describe("password reset", () => {
  test("three wrong codes lock the address for 24 hours", async () => {
    const t = setup();
    const email = "member@example.com";
    await createMember(t, { email });
    await t.mutation(api.passwordReset.requestPasswordReset, { email });

    for (const left of [2, 1]) {
      expect(await t.mutation(api.passwordReset.verifyOTPAndCreateSession, { email, otp: "000000" })).toEqual({
        success: false,
        error: `Invalid code. ${left} attempt(s) remaining.`,
      });
    }
    const third = await t.mutation(api.passwordReset.verifyOTPAndCreateSession, { email, otp: "000000" });
    expect(third).toMatchObject({ success: false, error: expect.stringMatching(/locked for 24 hours/) });

    const lockout = await t.run((ctx) =>
      ctx.db.query("otpLockouts").withIndex("by_email", (q) => q.eq("email", email)).first()
    );
    expect(lockout?.lockedUntil).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);

    const again = await t.mutation(api.passwordReset.requestPasswordReset, { email });
    expect(again).toMatchObject({ locked: true, delivered: false });
  });
});
