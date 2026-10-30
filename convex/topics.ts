import { v } from "convex/values";

// The topics a post can have, defined once: the Convex schema and validators, the Zod
// schemas and every topic picker or filter read them from here.
export const TOPICS = ["Web Architecture", "UI Engineering", "AI for Developers", "Productivity"] as const;
export type Topic = (typeof TOPICS)[number];

export const topicValidator = v.union(
  v.literal(TOPICS[0]),
  v.literal(TOPICS[1]),
  v.literal(TOPICS[2]),
  v.literal(TOPICS[3])
);

export function isTopic(value: unknown): value is Topic {
  return TOPICS.includes(value as Topic);
}
