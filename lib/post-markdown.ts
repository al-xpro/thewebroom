import "server-only";

import TurndownService from "turndown";

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

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://thewebroom.alxpro.com").replace(/\/$/, "");

export function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
