// Product metrics from raw activity, computed in the admin: active members, posts and
// comments per week, and weekly retention by sign-up cohort.

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

export type ActivityEvent = { userId: string; at: number; kind: "post" | "draft" | "comment" | "follow" };
export type Member = { id: string; createdAt: number };

export type Cohort = { label: string; size: number; weeks: (number | null)[] };

function weekLabel(start: number) {
  return new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function computeMetrics(members: Member[], events: ActivityEvent[], now: number, weeks = 12, cohortWeeks = 4) {
  const windows = Array.from({ length: weeks }, (_, i) => {
    const end = now - (weeks - 1 - i) * WEEK;
    return { start: end - WEEK, end };
  });
  const inWindow = (at: number, w: { start: number; end: number }) => at > w.start && at <= w.end;

  const activePerWeek = windows.map((w) => ({
    label: weekLabel(w.start),
    value: new Set(events.filter((e) => inWindow(e.at, w)).map((e) => e.userId)).size,
  }));
  const postsPerWeek = windows.map((w) => ({
    label: weekLabel(w.start),
    value: events.filter((e) => e.kind === "post" && inWindow(e.at, w)).length,
  }));
  const commentsPerWeek = windows.map((w) => ({
    label: weekLabel(w.start),
    value: events.filter((e) => e.kind === "comment" && inWindow(e.at, w)).length,
  }));

  // Members who joined in each of the last `weeks` weeks; for each, the share active in
  // their 1st, 2nd… week after joining (null when that week hasn't ended yet).
  const byUser = new Map<string, number[]>();
  for (const e of events) {
    const list = byUser.get(e.userId) ?? [];
    list.push(e.at);
    byUser.set(e.userId, list);
  }
  const cohorts: Cohort[] = windows.map((w) => {
    const joined = members.filter((m) => inWindow(m.createdAt, w));
    const weeksAfter = Array.from({ length: cohortWeeks }, (_, k) => {
      const end = w.end + (k + 1) * WEEK;
      if (end > now) return null;
      if (joined.length === 0) return null;
      const active = joined.filter((m) => {
        const from = m.createdAt + k * WEEK + WEEK;
        const to = from + WEEK;
        return (byUser.get(m.id) ?? []).some((at) => at > from && at <= to);
      }).length;
      return active / joined.length;
    });
    return { label: weekLabel(w.start), size: joined.length, weeks: weeksAfter };
  });

  const weighted = (k: number) => {
    let size = 0;
    let active = 0;
    for (const c of cohorts) {
      const share = c.weeks[k];
      if (share === null || c.size === 0) continue;
      size += c.size;
      active += share * c.size;
    }
    return size ? active / size : null;
  };

  const last4 = postsPerWeek.slice(-4).map((d) => d.value);
  return {
    activePerWeek,
    postsPerWeek,
    commentsPerWeek,
    cohorts: cohorts.filter((c) => c.size > 0),
    activeThisWeek: activePerWeek[activePerWeek.length - 1]?.value ?? 0,
    postsPerWeekAverage: last4.length ? last4.reduce((a, b) => a + b, 0) / last4.length : 0,
    retentionWeek1: weighted(0),
    retentionWeek4: weighted(cohortWeeks - 1),
    writers: new Set(events.filter((e) => e.kind === "post").map((e) => e.userId)).size,
  };
}
