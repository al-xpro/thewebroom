import { Id } from "@/convex/_generated/dataModel";
import z from "zod";

export const commentSchema = z.object({
  body: z.string().max(300, "Comment cannot exceed 300 characters"),
  postId: z.custom<Id<"posts">>(),
  parentId: z.custom<Id<"comments">>().optional(),
});
