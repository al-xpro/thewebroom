import { expect, test } from "vitest";
import { computeMetrics } from "./metrics";

const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 30);

test("active members, posts a week and retention by cohort", () => {
  const members = [
    { id: "a", createdAt: now - 20 * DAY },
    { id: "b", createdAt: now - 20 * DAY },
    { id: "c", createdAt: now - 2 * DAY },
  ];
  const events = [
    { userId: "a", at: now - 12 * DAY, kind: "post" as const },
    { userId: "a", at: now - 4 * DAY, kind: "comment" as const },
    { userId: "c", at: now - 1 * DAY, kind: "post" as const },
  ];
  const m = computeMetrics(members, events, now);
  expect(m.activeThisWeek).toBe(2);
  expect(m.retentionWeek1).toBe(0.5); // a was active in the week after joining, b wasn't
  expect(m.retentionWeek4).toBeNull(); // no cohort is four weeks old yet
  expect(m.postsPerWeek.slice(-2).map((d) => d.value)).toEqual([1, 1]);
  expect(m.cohorts[0]).toMatchObject({ size: 2, weeks: [0.5, 0.5, null, null] });
});
