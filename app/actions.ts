"use server";

import z from "zod";
import { editPostSchema, postSchema } from "./schemas/blog";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getToken } from "@/lib/auth-server";
import { updateTag } from "next/cache";
import { Id } from "@/convex/_generated/dataModel";
import { ConvexError } from "convex/values";

// Returns the slug instead of calling redirect() so the client can
// show the success toast before navigating. redirect() throws internally,
// which means any code after await createBlogAction() never executes —
// including showSuccessToast.
export async function createBlogAction(
  values: z.infer<typeof postSchema>,
  status: "published" | "draft" = "published"
) {
  const parsed = postSchema.safeParse(values);
  if (!parsed.success) throw new Error("Validation failed");

  const token = await getToken();
  if (!token) throw new Error("Not authenticated - no token found");

  let storageId = undefined;

  if (parsed.data.image) {
    const imageUrl = await fetchMutation(api.posts.generateImageUploadUrl, {}, { token });
    const uploadResult = await fetch(imageUrl, {
      method: "POST",
      headers: { "Content-Type": parsed.data.image.type },
      body: parsed.data.image,
    });
    if (!uploadResult.ok) throw new Error("Failed to upload image");
    const result = await uploadResult.json();
    storageId = result.storageId;
  }

  const response = await fetchMutation(
    api.posts.createPost,
    {
      body: parsed.data.content,
      subtitle: parsed.data.subtitle,
      title: parsed.data.title,
      minRead: parsed.data.minRead,
      contentHtml: parsed.data.contentHtml,
      topic: parsed.data.topic,
      status,
      imageStorageId: storageId,
    },
    { token }
  );

  updateTag("blog");

  return { slug: response.slug, id: response.id };
}

export async function deletePostAction(postId: string) {
  try {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");

    await fetchMutation(
      api.posts.deletePost,
      { postId: postId as Id<"posts"> },
      { token }
    );

    updateTag("blog");
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete post");
  }
}

export async function updatePostAction(
  postId: string,
  slug: string,
  values: z.infer<typeof editPostSchema>,
  existingImageStorageId: Id<"_storage"> | undefined,
  status: "published" | "draft" = "published",
  removeImage = false
) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  let imageStorageId: Id<"_storage"> | undefined = removeImage ? undefined : existingImageStorageId;

  if (values.image) {
    const imageUrl = await fetchMutation(api.posts.generateImageUploadUrl, {}, { token });
    const uploadResult = await fetch(imageUrl, {
      method: "POST",
      headers: { "Content-Type": values.image.type },
      body: values.image,
    });
    if (!uploadResult.ok) throw new Error("Failed to upload image");
    const result = await uploadResult.json();
    imageStorageId = result.storageId as Id<"_storage">;
  }

  const response = await fetchMutation(
    api.posts.updatePost,
    {
      postId: postId as Id<"posts">,
      title: values.title,
      body: values.content,
      subtitle: values.subtitle,
      minRead: values.minRead,
      contentHtml: values.contentHtml,
      imageStorageId,
      removeImage: removeImage && !values.image,
      topic: values.topic,
      status,
    },
    { token }
  );

  updateTag("blog");
  updateTag(`post-${slug}`);

  if (response.slug && response.slug !== slug) {
    updateTag(`post-${response.slug}`);
  }

  return response;
}

// Renames the member, then refreshes every cached page that shows the old name.
export async function updateDisplayNameAction(name: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  // Returned, not thrown: production hides the message of an error thrown from an action.
  let result;
  try {
    result = await fetchMutation(api.auth.updateDisplayName, { name }, { token });
  } catch (error) {
    return { ok: false as const, message: error instanceof ConvexError ? String(error.data) : "Failed to change your name" };
  }

  updateTag("blog");
  for (const slug of result.postSlugs) updateTag(`post-${slug}`);
  for (const postId of result.commentPostIds) updateTag(`comments-${postId}`);

  return { ok: true as const, name: result.name };
}
