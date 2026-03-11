import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getRealIp(request: NextRequest): string {
  // Vercel sets x-vercel-forwarded-for with the real client IP.
  // Fall back to x-forwarded-for (standard proxy header) then the
  // direct connection address. Never trust the request body for IP.
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Invalid request parameters" }, { status: 400 });
    }

    // Extract IP server-side — never trust client-supplied IP.
    const ipAddress = getRealIp(request);

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");

    const convex = new ConvexHttpClient(convexUrl);

    try {
      const result = await convex.mutation(api.rateLimiting.checkAccountCreationRateLimit, {
        ipAddress,
        email: email.toLowerCase().trim(),
      });

      if (!result.allowed) {
        return NextResponse.json(
          { message: "Too many accounts created recently. Please try again later." },
          { status: 429 }
        );
      }

      return NextResponse.json({ allowed: true }, { status: 200 });
    } catch {
      // Fail open — don't block signup if the rate limit check itself fails.
      // The Convex-side ban system is the authoritative guard.
      return NextResponse.json({ allowed: true }, { status: 200 });
    }
  } catch {
    return NextResponse.json(
      { message: "Unable to validate request. Please try again." },
      { status: 500 }
    );
  }
}