import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import {
  REVALIDATE_SIGNATURE_HEADER,
  REVALIDATE_TIMESTAMP_HEADER,
  signRevalidation,
} from "../lib/revalidate-signature";

// Asks the site to refresh cached pages after Convex changed them on its own (a scheduled
// post going out, #60). Failing to reach the site isn't fatal: the caches expire anyway.
export const revalidateTags = internalAction({
  args: { tags: v.array(v.string()) },
  handler: async (_ctx, { tags }) => {
    const secret = process.env.REVALIDATE_SECRET;
    const siteUrl = process.env.SITE_URL;
    if (!secret || !siteUrl) {
      console.warn("[Revalidate] REVALIDATE_SECRET or SITE_URL is not set: skipping", tags);
      return { ok: false };
    }

    const body = JSON.stringify({ tags });
    const timestamp = Date.now();
    try {
      const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/revalidate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [REVALIDATE_TIMESTAMP_HEADER]: String(timestamp),
          [REVALIDATE_SIGNATURE_HEADER]: await signRevalidation(secret, timestamp, body),
        },
        body,
      });
      if (!response.ok) console.warn("[Revalidate] site answered", response.status, tags);
      return { ok: response.ok };
    } catch (error) {
      console.warn("[Revalidate] site unreachable", String(error), tags);
      return { ok: false };
    }
  },
});
