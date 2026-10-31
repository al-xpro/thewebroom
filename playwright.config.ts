import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (#16). Against E2E_BASE_URL (a preview or dev deployment) when set;
// otherwise against `next dev` started here. Smoke tests need no account; the flows need
// E2E_EMAIL and E2E_PASSWORD for a test member on that deployment, and skip without them.
// `||`, not `??`: an unset repo variable reaches CI as an empty string.
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3100";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    // A browser already on the machine (PLAYWRIGHT_CHROMIUM_PATH); CI installs its own.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
    // The proxy turns away headless browsers on /create and /auth.
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], userAgent: undefined } },
    { name: "phone", use: { ...devices["Pixel 7"], userAgent: undefined } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npx next dev -p 3100", url: "http://localhost:3100/rules", reuseExistingServer: true, timeout: 180_000 },
});
