import { expect, test, type Page } from "@playwright/test";

// The main reader and author flows, against a deployment with a test member
// (E2E_BASE_URL, E2E_EMAIL, E2E_PASSWORD). Skipped without them.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
test.skip(!process.env.E2E_BASE_URL || !email || !password, "needs E2E_BASE_URL, E2E_EMAIL and E2E_PASSWORD");
test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel(/e-?mail/i).fill(email!);
  await page.getByLabel(/password/i).first().fill(password!);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"));
}

test("read a post", async ({ page }) => {
  await page.goto("/posts");
  const first = page.locator('a[href^="/posts/"]').first();
  await first.click();
  await expect(page.locator("article")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
});

test("sign in, write a draft, publish it, comment, and clean up", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "once is enough");
  await signIn(page);

  const title = `E2E post ${Date.now().toString(36)}`;
  await page.goto("/create");
  await page.evaluate(() => localStorage.setItem("twr:create-onboarding", "done"));
  await page.getByPlaceholder(/subject/i).fill(title);
  await page.getByPlaceholder(/main idea/i).fill("A post written by the end-to-end tests");
  await page.locator(".ProseMirror").click();
  await page.keyboard.insertText("Testing the whole flow. ".repeat(230));
  await page.locator('input[type="file"]').first().setInputFiles("tests/e2e/cover.png");

  await page.getByRole("button", { name: "Draft", exact: true }).click();
  await page.waitForURL("**/my-posts");
  await expect(page.getByText(title)).toBeVisible();

  // Publish from My posts, then read it and comment.
  await page.getByRole("button", { name: `Actions for ${title}` }).click();
  await page.getByRole("menuitem", { name: "Publish now" }).click();
  await expect(page.getByText(title).locator("..").getByText("published")).toBeVisible();
  await page.getByText(title).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await page.getByPlaceholder(/comment/i).fill("A comment from the end-to-end tests");
  await page.getByRole("button", { name: /^(comment|post|send)$/i }).click();
  await expect(page.getByText("A comment from the end-to-end tests")).toBeVisible();

  // Clean up.
  await page.goto("/my-posts");
  await page.getByRole("button", { name: `Actions for ${title}` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(title)).toHaveCount(0);
});
