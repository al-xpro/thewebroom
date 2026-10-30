import "server-only";

import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { POST_CONFIG } from "@/lib/sanitize-config";

// DOMPurify needs a DOM; on the server it runs on jsdom, the window DOMPurify recommends.
const window = new JSDOM("").window;
const purify = createDOMPurify(window);

/**
 * Sanitize post HTML on the server, before it's rendered or sent to the client.
 * `contentHtml` is written by the client, so it's never trusted as stored.
 */
export function sanitizePostHtml(dirty: string): string {
  if (!dirty) return "";
  return purify.sanitize(dirty, POST_CONFIG) as string;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// The plain text of post HTML, the way the editor counts a body's length.
export function htmlToText(html: string): string {
  const template = window.document.createElement("template");
  template.innerHTML = html;
  return (template.content.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}
