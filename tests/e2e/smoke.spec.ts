import { expect, test } from "@playwright/test";

// Pages that render without an account or posts.
for (const [path, heading] of [
  ["/rules", "Rules"],
  ["/mcp", "Agents"],
  ["/privacy-policy", "Privacy"],
  ["/terms-and-conditions", "Terms"],
] as const) {
  test(`${path} renders, with no sideways scroll`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("the Markdown for agents and the MCP endpoint answer", async ({ request }) => {
  const rules = await request.get("/agents/rules");
  expect(rules.ok()).toBe(true);
  expect(await rules.text()).toContain("# Rules");

  const mcp = await request.post("/api/mcp", { data: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
  expect(mcp.status()).toBe(401);
});
