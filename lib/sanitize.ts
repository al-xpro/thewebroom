/**
 * HTML Sanitization — client-side only (DOMPurify).
 * SSR path returns the string as-is; Content-Security-Policy headers cover that layer.
 */

"use client";

import DOMPurify from "dompurify";

// Enumerate every data-* attribute used by FileCodeBlock and TerminalBlock.
// DOMPurify's ALLOWED_ATTR only accepts string[], not RegExp — be explicit.
const DATA_ATTRS = [
  "data-type",
  "data-filename",
  "data-file-icon",
  "data-language",
  "data-highlighted-lines",
  "data-package-manager",
  "data-npm-content",
  "data-pnpm-content",
  "data-yarn-content",
  "data-shiki-light",
  "data-shiki-dark",
  "data-callout",
];

// ─── Post content (rich HTML from TipTap editor) ──────────────────────────────
const POST_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "h1", "h2", "h3", "h4",
    "ul", "ol", "li",
    "a",
    "code", "pre",
    "img",
    "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col",
    "blockquote",
    "figure", "figcaption",
    "div", "span",
    "hr",
  ] as string[],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "target", "rel",
    "class", "id", "style",
    ...DATA_ATTRS,
  ] as string[],
  KEEP_CONTENT: true,
  ADD_ATTR: ["target"] as string[],
} satisfies Parameters<typeof DOMPurify.sanitize>[1];

// ─── Comment bodies (plain prose only) ───────────────────────────────────────
const COMMENT_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "code"] as string[],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
} satisfies Parameters<typeof DOMPurify.sanitize>[1];

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