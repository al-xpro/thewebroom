/**
 * DOMPurify allow-lists, shared by the browser (`lib/sanitize.ts`) and the server
 * (`lib/sanitize-server.ts`) so both paths keep exactly the same tags and attributes.
 */

import type DOMPurify from "dompurify";

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
  "data-badge"
];

// ─── Post content (rich HTML from TipTap editor) ──────────────────────────────
export const POST_CONFIG = {
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
export const COMMENT_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "code"] as string[],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
} satisfies Parameters<typeof DOMPurify.sanitize>[1];
