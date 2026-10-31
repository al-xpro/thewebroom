import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

// Two projects: fast unit tests for lib/, and Convex functions against convex-test's
// in-memory backend (#16). Playwright's end-to-end tests run separately (npm run test:e2e).
export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      // Next.js marks server modules with "server-only"; in tests it's a no-op.
      "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["lib/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "convex",
          include: ["tests/convex/**/*.test.ts"],
          environment: "edge-runtime",
          server: { deps: { inline: ["convex-test", "@convex-dev/better-auth"] } },
          // Read when convex/auth.ts loads.
          env: { ADMIN_EMAIL: "admin@example.com", SITE_URL: "http://localhost:3000" },
        },
      },
    ],
  },
});
