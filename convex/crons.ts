import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "clean up old rate-limit records",
  { hourUTC: 3, minuteUTC: 0 },
  internal.rateLimiting.cleanupOldRateLimitRecords
);

crons.daily(
  "delete images never attached to a post",
  { hourUTC: 3, minuteUTC: 30 },
  internal.uploads.cleanupOrphanUploads
);

export default crons;
