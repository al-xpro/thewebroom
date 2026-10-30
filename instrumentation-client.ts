import * as Sentry from "@sentry/nextjs";

// Error tracking in the browser. Off until NEXT_PUBLIC_SENTRY_DSN is set; no personal data
// (IP, cookies) is sent.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  // Noise from extensions and aborted navigations.
  ignoreErrors: ["ResizeObserver loop limit exceeded", "ResizeObserver loop completed with undelivered notifications", "AbortError"],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
