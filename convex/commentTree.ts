import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Deletes a comment and every reply under it, at any depth.
export async function deleteCommentTree(ctx: MutationCtx, commentId: Id<"comments">) {
  const stack: Id<"comments">[] = [commentId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parentId", (q) => q.eq("parentId", id))
      .collect();
    for (const reply of replies) stack.push(reply._id);
    await ctx.db.delete(id);
  }
}
