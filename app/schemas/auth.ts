import z from "zod";

export const signUpSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(10)
    .regex(/^[a-zA-Z0-9\s-]+$/, "Name cannot contain special characters"),
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password must be at most 20 characters"),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password must be at most 20 characters"),
});
