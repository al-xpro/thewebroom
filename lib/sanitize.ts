/**
 * HTML sanitization in the browser (DOMPurify). Server-rendered post HTML is sanitized
 * before it reaches the client by `lib/sanitize-server.ts`, with the same allow-lists.
 */

"use client";

import DOMPurify from "dompurify";
import { COMMENT_CONFIG, POST_CONFIG, styleHook } from "@/lib/sanitize-config";

// Only the inline styles posts need (see cleanStyle).
if (typeof window !== "undefined") DOMPurify.addHook("uponSanitizeAttribute", styleHook);

/**
 * Sanitize rich post HTML (custom blocks, Shiki output).
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";
  if (typeof window === "undefined") return dirty;
  try {
    return DOMPurify.sanitize(dirty, POST_CONFIG) as string;
  } catch (err) {
    console.error("[sanitizeHtml]", err);
    return "";
  }
}

/**
 * Sanitize comment text — strips everything except basic prose tags.
 */
export function sanitizeComment(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";
  if (typeof window === "undefined") return dirty;
  try {
    return DOMPurify.sanitize(dirty, COMMENT_CONFIG) as string;
  } catch (err) {
    console.error("[sanitizeComment]", err);
    return "";
  }
}
