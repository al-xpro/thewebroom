import { internalMutation } from "./_generated/server";

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const migrateOtpToHashOnly = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Query the specific table so TypeScript knows the exact document shape
    const records = await ctx.db.query("passwordResetOtps").collect();

    let migrated = 0;
    let skipped = 0;
    let deleted = 0;

    for (const record of records) {
      // Access the legacy otp field via index signature — it exists in the
      // database even though it's being removed from the schema
      const plainOtp = (record as Record<string, unknown>)["otp"] as string | undefined;

      if (record.expiresAt < Date.now()) {
        await ctx.db.delete(record._id);
        deleted++;
        continue;
      }

      if (record.otpHash && !plainOtp) {
        skipped++;
        continue;
      }

      if (plainOtp) {
        const otpHash = await sha256Hex(plainOtp);
        // Use a typed partial update — only set fields that exist in the schema
        await ctx.db.patch(record._id, { otpHash });
        migrated++;
      }
    }

    return { migrated, skipped, deleted };
  },
});

// #65 moved e-mail verification to better-auth. Run once per deployment, then remove the
// emailVerificationTokens table from the schema.
export const deleteEmailVerificationTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("emailVerificationTokens").collect();
    for (const token of tokens) await ctx.db.delete(token._id);
    return { deleted: tokens.length };
  },
});
