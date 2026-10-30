import z from "zod";
import { TOPICS } from "@/convex/topics";

const MAX_IMAGE_SIZE = 1 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/tiff",
];

const imageField = z
  .instanceof(File)
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Only JPEG, PNG, WebP, AVIF and TIFF images are accepted"
  )
  .refine((file) => file.size <= MAX_IMAGE_SIZE, "Image must be smaller than 1 MB");

const baseSchema = z.object({
  title: z
    .string()
    .min(6, "Title must be at least 6 characters")
    .max(50, "Title must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Title cannot contain special characters"),

  subtitle: z
    .string()
    .min(20, "Subtitle must be at least 20 characters")
    .max(80, "Subtitle must be less than 80 characters"),

  topic: z.enum(TOPICS),

  minRead: z
    .number()
    .min(1, "Reading time must be at least 1 minute")
    .max(30, "Reading time must be less than 30 minutes"),

  content: z
    .string()
    .min(5000, "Content must be at least 5000 characters")
    .max(30000, "Content must be less than 30000 characters"),

  contentHtml: z.string().min(1, "Content is required"),
});

// Create: image is required — a new post must have a featured image.
export const postSchema = baseSchema.extend({
  image: imageField,
});

// Edit: image is optional — the existing Convex image is kept when no
// new file is selected. Only validate the File if the user picks one.
export const editPostSchema = baseSchema.extend({
  image: imageField.optional(),
});

// Drafts save whatever is there: nothing is required until the post is published or
// scheduled. An empty title becomes "Untitled draft".
export const draftSchema = z.object({
  title: z.string().max(50).optional().transform((title) => title?.trim() || "Untitled draft"),
  subtitle: z.string().max(80).optional().default(""),
  topic: z.enum(TOPICS).optional().default("Web Architecture"),
  minRead: z.number().min(1).max(30).optional().default(5),
  content: z.string().max(30000).optional().default(""),
  contentHtml: z.string().optional().default(""),
  image: imageField.optional(),
});
