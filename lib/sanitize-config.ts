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

// ─── Inline styles in posts ───────────────────────────────────────────────────
// Posts need two kinds of style: text alignment from the editor, and Shiki's colours in
// code blocks. Everything else is dropped, and no value may load anything (url(),
// expression(), javascript:), so a post can't draw overlays or fetch resources (#16).
const STYLE_PROPERTIES = new Set([
  "text-align",
  "color",
  "background-color",
  "font-style",
  "font-weight",
  "text-decoration",
]);

export function cleanStyle(value: string): string {
  return value
    .split(";")
    .map((declaration) => declaration.trim())
    .filter((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon <= 0) return false;
      const property = declaration.slice(0, colon).trim().toLowerCase();
      const propertyValue = declaration.slice(colon + 1).toLowerCase();
      if (/url\(|expression\(|javascript:|@import/.test(propertyValue)) return false;
      return STYLE_PROPERTIES.has(property) || property.startsWith("--shiki");
    })
    .join("; ");
}

// For DOMPurify's uponSanitizeAttribute hook: filters style attributes with cleanStyle.
export function styleHook(_node: Element, data: { attrName: string; attrValue: string; keepAttr: boolean }) {
  if (data.attrName !== "style") return;
  const cleaned = cleanStyle(data.attrValue);
  if (cleaned) data.attrValue = cleaned;
  else data.keepAttr = false;
}
