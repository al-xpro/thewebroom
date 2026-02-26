import z from "zod";

const MAX_IMAGE_SIZE = 1 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/tiff"];

export const postSchema = z.object({
  title: z
    .string()
    .min(6, "Title must be at least 6 characters")
    .max(50, "Title must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Title cannot contain special characters"),

  subtitle: z
    .string()
    .min(20, "Subtitle must be at least 20 characters")
    .max(80, "Subtitle must be less than 80 characters"),

  topic: z.enum(["Web Architecture", "UI Engineering", "AI for Developers", "Productivity"]),

  minRead: z
    .number()
    .min(1, "Reading time must be at least 1 minute")
    .max(30, "Reading time must be less than 30 minutes"),

  image: z
    .instanceof(File)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only JPEG, PNG, WebP, AVIF and TIFF images are accepted"
    )
    .refine(
      (file) => file.size <= MAX_IMAGE_SIZE,
      "Image must be smaller than 1 MB"
    ),

  content: z
    .string()
    .min(1000, "Content must be at least 1000 characters")
    .max(10000, "Content must be less than 10000 characters"),

  contentHtml: z
    .string()
    .min(1000, "Content must be at least 1000 characters")
    .max(100000, "Content must be less than 100000 characters"),
});