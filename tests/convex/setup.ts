/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import schema from "../../convex/schema";
import { components } from "../../convex/_generated/api";

// Every Convex module, for convex-test (tests live outside convex/ so they're never deployed).
export const modules = import.meta.glob("../../convex/**/!(*.test).ts");

export function setup() {
  const t = convexTest(schema, modules);
  betterAuthTest.register(t, "betterAuth");
  return t;
}

export type T = ReturnType<typeof setup>;

// A member with a signed-in session; `as` runs functions as them.
export async function createMember(
  t: T,
  { email, name = "Member", verified = true }: { email: string; name?: string; verified?: boolean }
) {
  const now = Date.now();
  const user = (await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.create, {
      input: { model: "user", data: { name, email, emailVerified: verified, createdAt: now, updatedAt: now } },
    })
  )) as { _id: string };
  const session = (await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: { userId: user._id, token: `token-${user._id}`, expiresAt: now + 86_400_000, createdAt: now, updatedAt: now },
      },
    })
  )) as { _id: string };
  return { id: user._id, email, as: t.withIdentity({ subject: user._id, sessionId: session._id }) };
}

export const DRAFT = {
  title: "Caching in practice",
  subtitle: "What we learned moving our cache to the edge",
  body: "body ".repeat(20),
  minRead: 3,
  contentHtml: "<p>body</p>",
};
