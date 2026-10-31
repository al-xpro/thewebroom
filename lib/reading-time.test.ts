import { expect, test } from "vitest";
import { estimateMinRead } from "./reading-time";

test("about 220 words a minute, between 1 and 30", () => {
  expect(estimateMinRead("")).toBe(1);
  expect(estimateMinRead("word ".repeat(220))).toBe(1);
  expect(estimateMinRead("word ".repeat(660))).toBe(3);
  expect(estimateMinRead("word ".repeat(100_000))).toBe(30);
});
