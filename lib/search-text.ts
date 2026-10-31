// Text helpers for the dock's search: what a post's body says, and the part around a match.

// A post's searchable text: what it shows, plus every package manager's command in its
// terminal blocks and the code in its file blocks. Browser only (empty on the server).
export function extractTextFromHtml(html: string): string {
  if (typeof window === "undefined") return "";

  const doc = new DOMParser().parseFromString(html, "text/html");
  const textParts: string[] = [];

  if (doc.body.textContent) textParts.push(doc.body.textContent);

  doc.querySelectorAll('[data-type="terminal-block"]').forEach((el) => {
    textParts.push(el.textContent ?? "");
    for (const manager of ["npm", "pnpm", "yarn"]) {
      const command = el.getAttribute(`data-${manager}-content`);
      if (command) textParts.push(command);
    }
  });

  doc.querySelectorAll('[data-type="file-code-block"] code').forEach((code) => {
    textParts.push(code.textContent ?? "");
  });

  return textParts.join(" ").replace(/\s+/g, " ").trim();
}

// Up to `maxLength` characters of `text` centred on the first match of `term`, with an
// ellipsis where it was cut; the start of the text when there's no match.
export function getExcerpt(text: string, term: string, maxLength = 160) {
  if (!text) return "";

  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return text.slice(0, maxLength) + (text.length > maxLength ? "…" : "");

  const half = Math.floor(maxLength / 2);
  let start = index - half;
  let end = index + half;

  if (start < 0) {
    start = 0;
    end = maxLength;
  }
  if (end > text.length) {
    end = text.length;
    start = Math.max(0, end - maxLength);
  }

  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
