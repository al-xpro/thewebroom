"use server";

import { randomBytes } from "node:crypto";
import { fetchMutation } from "convex/nextjs";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { getToken } from "@/lib/auth-server";

// Makes a token from a strong random source and stores its hash; the token itself is
// returned once, to be copied, and never stored.
export async function createAgentTokenAction(name: string) {
  const authToken = await getToken();
  if (!authToken) return { error: "Sign in to create a token." } as const;

  const token = `twr_${randomBytes(32).toString("base64url")}`;
  try {
    await fetchMutation(api.agents.createToken, { name, token }, { token: authToken });
  } catch (error) {
    const message = error instanceof ConvexError && typeof error.data === "string" ? error.data : "Couldn't create the token.";
    return { error: message } as const;
  }
  return { token } as const;
}
