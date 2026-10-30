import "server-only";

import { JSDOM } from "jsdom";
import { htmlToMarkdown } from "@/lib/post-markdown";

// A static page's text as Markdown, for agents: renders the page as a visitor would, keeps
// the main column and drops navigation, buttons and the footer.
export async function pageToMarkdown(origin: string, path: string) {
  const response = await fetch(new URL(path, origin), { headers: { Accept: "text/html" } });
  if (!response.ok) return null;
  const dom = new JSDOM(await response.text());
  const main = dom.window.document.querySelector("main main, main section, main") ?? dom.window.document.body;
  main.querySelectorAll("script, style, nav, footer, button, svg, [aria-hidden='true']").forEach((node) => node.remove());
  return htmlToMarkdown(main.innerHTML);
}
