import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { DRAFT, createMember, setup, type T } from "./setup";

async function ban(t: T, email: string) {
  await t.run((ctx) =>
    ctx.db.insert("bannedUsers", { email, active: true, bannedAt: Date.now(), bannedByUserId: "admin" })
  );
}

describe("post visibility", () => {
  test("a draft is visible only to its author and admins", async () => {
    const t = setup();
    const author = await createMember(t, { email: "author@example.com" });
    const other = await createMember(t, { email: "other@example.com" });
    const admin = await createMember(t, { email: "admin@example.com" });
    const { slug } = await author.as.mutation(api.posts.createPost, { ...DRAFT, status: "draft" });

    expect(await t.query(api.posts.getPostBySlug, { slug })).toBeNull();
    expect(await other.as.query(api.posts.getPostBySlug, { slug })).toBeNull();
    expect((await author.as.query(api.posts.getPostBySlug, { slug }))?.title).toBe(DRAFT.title);
    expect((await admin.as.query(api.posts.getPostBySlug, { slug }))?.title).toBe(DRAFT.title);
  });

  test("a published post is public and listed; a draft isn't listed", async () => {
    const t = setup();
    const author = await createMember(t, { email: "author@example.com" });
    const { slug } = await author.as.mutation(api.posts.createPost, { ...DRAFT, status: "published" });
    await author.as.mutation(api.posts.createPost, { ...DRAFT, title: "Still a draft", status: "draft" });

    expect((await t.query(api.posts.getPostBySlug, { slug }))?.slug).toBe(slug);
    const listed = await t.query(api.posts.getPublishedPosts, {});
    expect(listed.map((post) => post.title)).toEqual([DRAFT.title]);
  });
});

describe("moderation", () => {
  test("authors can't hide or flag; admins can, and hidden posts disappear", async () => {
    const t = setup();
    const author = await createMember(t, { email: "author@example.com" });
    const admin = await createMember(t, { email: "admin@example.com" });

    await expect(author.as.mutation(api.posts.createPost, { ...DRAFT, status: "hidden" })).rejects.toThrow(/moderators/);

    const { id, slug } = await author.as.mutation(api.posts.createPost, { ...DRAFT, status: "published" });
    await expect(author.as.mutation(api.posts.updatePost, { postId: id, status: "hidden" })).rejects.toThrow();

    await admin.as.mutation(api.posts.updatePost, { postId: id, status: "hidden" });
    expect(await t.query(api.posts.getPostBySlug, { slug })).toBeNull();
    expect(await t.query(api.posts.getPublishedPosts, {})).toHaveLength(0);
  });
});

describe("rate limits", () => {
  test("two posts a day, drafts included", async () => {
    const t = setup();
    const author = await createMember(t, { email: "author@example.com" });
    await author.as.mutation(api.posts.createPost, { ...DRAFT, status: "draft" });
    await author.as.mutation(api.posts.createPost, { ...DRAFT, status: "published" });
    await expect(author.as.mutation(api.posts.createPost, { ...DRAFT, status: "draft" })).rejects.toThrow(/per day/);
  });

  test("three comments every six hours", async () => {
    const t = setup();
    const author = await createMember(t, { email: "author@example.com" });
    const reader = await createMember(t, { email: "reader@example.com" });
    const { id } = await author.as.mutation(api.posts.createPost, { ...DRAFT, status: "published" });
    for (let i = 0; i < 3; i++) await reader.as.mutation(api.comment.createComment, { postId: id, body: `Comment ${i}` });
    await expect(reader.as.mutation(api.comment.createComment, { postId: id, body: "One more" })).rejects.toThrow(/6 hours/);
  });
});

describe("bans", () => {
  test("a banned member can't post or comment", async () => {
    const t = setup();
    const author = await createMember(t, { email: "author@example.com" });
    const banned = await createMember(t, { email: "banned@example.com" });
    const { id } = await author.as.mutation(api.posts.createPost, { ...DRAFT, status: "published" });
    await ban(t, "banned@example.com");

    await expect(banned.as.mutation(api.posts.createPost, { ...DRAFT, status: "draft" })).rejects.toThrow(/banned/);
    await expect(banned.as.mutation(api.comment.createComment, { postId: id, body: "Hi" })).rejects.toThrow(/banned/);
  });
});
