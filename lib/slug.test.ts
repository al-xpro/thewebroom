import { describe, expect, test } from "vitest";
import { generateSlug } from "./slug";

describe("generateSlug", () => {
  test.each([
    ["Hello World", "hello-world"],
    ["  Caching   in   React  ", "caching-in-react"],
    ["What's new? (2026)", "whats-new-2026"],
    ["a -- b", "a-b"],
    ["--edge--", "edge"],
    ["", ""],
  ])("%j → %j", (title, slug) => {
    expect(generateSlug(title)).toBe(slug);
  });
});
