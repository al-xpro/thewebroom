import * as Sentry from "@sentry/nextjs";

// Error tracking on the server and the edge (the proxy). Off until SENTRY_DSN (or
// NEXT_PUBLIC_SENTRY_DSN) is set.
export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
    });
  }
}

// Errors thrown while rendering or in route handlers and server actions.
export const onRequestError = Sentry.captureRequestError;
