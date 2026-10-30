import { track } from "@vercel/analytics";

// Product events for Vercel Analytics, named once. Cookieless; never send personal data
// (names, e-mail, post text) as properties.
export type AnalyticsEvent =
  | "sign_up"
  | "onboarding_completed"
  | "post_published"
  | "draft_saved"
  | "comment_posted"
  | "follow"
  | "agent_used";

export function trackEvent(name: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  try {
    track(name, properties);
  } catch {
    // Analytics never breaks the page.
  }
}
