import { v } from "convex/values";

// The topics a post can have, defined once: the Convex schema and validators, the Zod
// schemas and every topic picker or filter read them from here. Names avoid "&": the
// posts filter puts them in the URL as they are.
export const TOPICS = [
  "Web Architecture",
  "UI Engineering",
  "AI for Developers",
  "Productivity",
  "Performance",
  "Accessibility",
  "Security",
  "Design Systems",
  "Databases",
  "DevOps",
  "Testing",
  "Career",
] as const;
export type Topic = (typeof TOPICS)[number];

export const topicValidator = v.union(...TOPICS.map((topic) => v.literal(topic)));

export function isTopic(value: unknown): value is Topic {
  return TOPICS.includes(value as Topic);
}
