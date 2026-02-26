"use server";

import z from "zod";
import { postSchema } from "./schemas/blog";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth-server";
import { updateTag } from "next/cache";
import { Id } from "@/convex/_generated/dataModel";

export async function createBlogAction(values: z.infer<typeof postSchema>) {
  let slug: string;

  try {
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
        imageStorageId: storageId,
      },
      { token }
    );

    updateTag("blog");
    slug = response.slug;
  } catch (error) {
    console.error("Error creating post:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create post");
  }

  redirect(`/posts/${slug}`);
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
