/**
 * HTML sanitization in the browser (DOMPurify). Server-rendered post HTML is sanitized
 * before it reaches the client by `lib/sanitize-server.ts`, with the same allow-lists.
 */

"use client";

import DOMPurify from "dompurify";
import { COMMENT_CONFIG, POST_CONFIG } from "@/lib/sanitize-config";

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

export function sanitizeAttribute(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function stripHtmlTags(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]*>/g, "");
}

export function extractTextPreview(html: string, maxLength = 155): string {
  if (!html || typeof html !== "string") return "";
  const text = stripHtmlTags(html);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}