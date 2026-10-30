import "server-only";

import TurndownService from "turndown";
import { marked } from "marked";
import { sanitizePostHtml } from "@/lib/sanitize-server";

// Turns a post's stored HTML into Markdown for agents (/agents/posts/<slug>, /llms.txt).
// Code blocks keep their language; terminal blocks become bash blocks with the npm tab.

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

turndown.addRule("fileCodeBlock", {
  filter: (node) => node.nodeName === "PRE" && node.getAttribute("data-type") === "file-code-block",
  replacement: (_content, node) => {
    const element = node as HTMLElement;
    const lang = element.getAttribute("data-file-icon") ?? "";
    const fileName = element.getAttribute("data-file-name");
    const code = element.textContent ?? "";
    return `\n\n${fileName ? `\`${fileName}\`\n\n` : ""}\`\`\`${lang}\n${code.replace(/\n$/, "")}\n\`\`\`\n\n`;
  },
});

turndown.addRule("terminalBlock", {
  filter: (node) => node.nodeName === "DIV" && node.getAttribute("data-type") === "terminal-block",
  replacement: (content, node) => {
    const element = node as HTMLElement;
    const commands = element.getAttribute("data-npm-content") || content;
    return `\n\n\`\`\`bash\n${commands.trim()}\n\`\`\`\n\n`;
  },
});

export function htmlToMarkdown(html: string) {
  return turndown.turndown(html).trim();
}

import { SITE_URL } from "@/lib/site-url";

export { SITE_URL };

export function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// Markdown from an agent (MCP) as post HTML: GitHub-flavoured, then sanitized like any post.
export function markdownToPostHtml(markdown: string) {
  const html = marked.parse(markdown, { gfm: true, breaks: false, async: false });
  return sanitizePostHtml(html);
}

type MarkdownPost = {
  title: string;
  subtitle?: string;
  authorName: string;
  topic: string;
  slug?: string;
  body: string;
  contentHtml?: string;
  publishAt?: number;
  _creationTime: number;
  aiAssisted?: boolean;
};

// A post as Markdown, for agents: a short header, then the body.
export function postToMarkdown(post: MarkdownPost) {
  const date = new Date(post.publishAt ?? post._creationTime).toISOString().slice(0, 10);
  const body = htmlToMarkdown(sanitizePostHtml(post.contentHtml || `<p>${escapeXml(post.body)}</p>`));
  return `---
title: ${JSON.stringify(post.title)}
subtitle: ${JSON.stringify(post.subtitle ?? "")}
author: ${JSON.stringify(post.authorName)}
date: ${date}
topic: ${JSON.stringify(post.topic)}
url: ${SITE_URL}/posts/${post.slug}${post.aiAssisted ? "\nai_assisted: true" : ""}
---

# ${post.title}

${body}
`;
}
