"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// The last resort when the root layout itself fails: reports the error and offers a reload.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#666", fontWeight: 300 }}>It&apos;s been reported. Try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, padding: "8px 16px", borderRadius: 999, border: 0, background: "#000", color: "#fff", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
