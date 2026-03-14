import { highlighterPromise } from "@/lib/extension/shiki";

const LANGUAGES = ["ts", "tsx", "js", "jsx"];

export async function injectShikiIntoHtml(html: string): Promise<string> {
  const hl = await highlighterPromise;

  // Match each file-code-block pre element
  return html.replace(
    /<pre([^>]*data-type="file-code-block"[^>]*)>([\s\S]*?)<\/pre>/g,
    (match, attrs: string, inner: string) => {
      const fileIconMatch = attrs.match(/data-file-icon="([^"]*)"/);
      const fileIcon = fileIconMatch?.[1] ?? "text";
      const codeMatch = inner.match(/<code[^>]*>([\s\S]*?)<\/code>/);
      if (!codeMatch) return match;

      const code = codeMatch[1]
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      try {
        const lang = LANGUAGES.includes(fileIcon) ? fileIcon : "text";
        const opts = { lang, themes: { light: "vercel-light", dark: "vercel-dark" }, defaultColor: false } as const;
        const lightHtml = hl.codeToHtml(code, opts);
        const darkHtml  = hl.codeToHtml(code, opts);

        // Inject as data attributes — URI-encoded to survive HTML attribute context
        const extra = ` data-shiki-light="${encodeURIComponent(lightHtml)}" data-shiki-dark="${encodeURIComponent(darkHtml)}"`;
        return `<pre${attrs}${extra}>${inner}</pre>`;
      } catch {
        return match; // leave untouched on error, client will handle it
      }
    }
  );
}