import { expect, test } from "vitest";
import { agentViewFor } from "./agent-pages";

test("public pages have a Markdown view; personal pages have none", () => {
  expect(agentViewFor("/")?.href).toBe("/llms.txt");
  expect(agentViewFor("/posts/hello")?.href).toBe("/agents/posts/hello");
  expect(agentViewFor("/rules")?.href).toBe("/agents/rules");
  for (const path of ["/profile", "/my-posts", "/notifications", "/following", "/admin", "/edit/x"]) {
    expect(agentViewFor(path)).toBeNull();
  }
});
