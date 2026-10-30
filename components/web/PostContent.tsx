"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { SiNextdotjs, SiReact } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { highlighterPromise } from "@/lib/extension/shiki";
import { sanitizeHtml } from "@/lib/sanitize";
import { LogoTypescript } from "../ui/LogoTypescript";
import { LogoJavascript } from "../ui/LogoJavascript";

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(getText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button
      type="button"
      onClick={handle}
      aria-label="copy button"
      className="p-2 rounded-md transition cursor-pointer hover:bg-(--alxpro-ui-hover)"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0.1 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.1 }}
            transition={{ duration: 0.25 }}
          >
            <Check className="size-4 text-(--alxpro-terminal-muted)" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0.1 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.1 }}
            transition={{ duration: 0.25 }}
          >
            <Copy className="size-4 text-(--alxpro-terminal-muted)" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

// ─── Terminal Block ───────────────────────────────────────────────────────────

const MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
type Manager = (typeof MANAGERS)[number];

const CMD_RE =
  /^(npm|pnpm|yarn|npx|bun|bunx|cd|git|rm|mv|touch|mkdir|ls|echo|cat|ls|dlx|node|sudo|cp|grep|curl|wget|chmod|pwd|docker|docker-compose|gh|vercel)\b/;

function TerminalLine({ line }: { line: string }) {
  if (line.startsWith("#")) {
    return <div className="text-(--alxpro-syntax-comment)">{line || <br />}</div>;
  }
  const match = line.match(CMD_RE);
  if (!match) return <div className="text-(--alxpro-syntax-argument)">{line || <br />}</div>;
  const prefix = match[0];
  const rest = line.slice(prefix.length);
  return (
    <div>
      <span className="text-(--alxpro-syntax-command)">{prefix}</span>
      <span className="text-(--alxpro-syntax-argument)">{rest}</span>
    </div>
  );
}

interface TerminalData {
  activeManager: Manager;
  // Each slot holds the raw text for that tab.
  // Empty string means the user never typed anything there — shown as empty.
  npm: string;
  pnpm: string;
  yarn: string;
  bun: string;
  showHeader: boolean;
}

function TerminalBlock({ data }: { data: TerminalData }) {
  const [active, setActive] = useState<Manager>("npm");
  const contents: Record<Manager, string> = {
    npm: data.npm,
    pnpm: data.pnpm,
    yarn: data.yarn,
    bun: data.bun,
  };
  const text = contents[active];
  const lines = text ? text.split("\n") : [];

  return (
    <div className="relative group rounded-lg max-w-full mx-auto overflow-hidden border border-(--alxpro-terminal-border)">
      {/* Sticky copy button — outside scroll container, only when no header */}
      {!data.showHeader && (
        <div className="absolute top-[9px] right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-[10px] bg-(--alxpro-terminal-header) border border-(--alxpro-terminal-border)">
          <CopyButton getText={() => text} />
        </div>
      )}

      {data.showHeader && (
        <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 border-b border-(--alxpro-terminal-border) bg-(--alxpro-terminal-header) select-none">
          <div className="flex items-center gap-2 sm:gap-3">
            <Terminal className="size-4 text-neutral-500" />
            <div className="flex gap-1 text-xs font-mono">
              {MANAGERS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setActive(m)}
                  className={`px-1 sm:px-2 py-0.5 rounded transition cursor-pointer ${
                    active === m
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-(--alxpro-ui-hover)"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <CopyButton getText={() => text} />
        </div>
      )}

      <div className="bg-(--alxpro-terminal-background) w-full p-4 font-mono text-[13px] leading-[20px] overflow-x-auto">
        <div className="whitespace-pre min-w-max">
          {lines.length > 0 ? (
            lines.map((line, i) => <TerminalLine key={i} line={line} />)
          ) : (
            <span className="text-paragraph opacity-40 italic">No content for {active}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── File Code Block ──────────────────────────────────────────────────────────

// Reuse the exact same highlighter instance the editor already set up.
// This guarantees alxpro-light / alxpro-dark are registered and avoids
// a second download of the shiki bundle.
function getHighlighter() {
  return highlighterPromise;
}

interface FileData {
  showHeader: boolean;
  filename: string;
  fileIcon: string;
  highlightedLines: number[];
  code: string;
  ssrLight: string | null;
  ssrDark: string | null;
}

// ─── File Code Block ──────────────────────────────────────────────────────────

function FileCodeBlock({ data }: { data: FileData }) {
  const [lightHtml, setLightHtml] = useState<string | null>(data.ssrLight ?? null);
  const [darkHtml, setDarkHtml] = useState<string | null>(data.ssrDark ?? null);

  useEffect(() => {
    if (data.ssrLight !== null) setLightHtml(data.ssrLight);
    if (data.ssrDark !== null) setDarkHtml(data.ssrDark);
  }, [data.ssrLight, data.ssrDark]);

  const getFileIcon = (lang: string) => {
    switch (lang) {
      case "ts":
        return <LogoTypescript className="size-4" />;
      case "tsx":
        return <SiNextdotjs className="size-4 scale-110" />;
      case "js":
        return <LogoJavascript className="size-4" />;
      case "jsx":
        return <SiReact className="size-4 scale-130" />;
      default:
        return null;
    }
  };

  const languages = ["ts", "tsx", "js", "jsx"];

  useEffect(() => {
    if (data.ssrLight && data.ssrDark) return;
    if (!data.code) return;
    let active = true;
    (async () => {
      try {
        const hl = await getHighlighter();
        const opts = { defaultColor: false } as const;
        const light = hl.codeToHtml(data.code, {
          lang: languages.includes(data.fileIcon) ? data.fileIcon : "text",
          themes: { light: "alxpro-light", dark: "alxpro-dark" },
          ...opts,
        });
        const dark = hl.codeToHtml(data.code, {
          lang: languages.includes(data.fileIcon) ? data.fileIcon : "text",
          themes: { light: "alxpro-light", dark: "alxpro-dark" },
          ...opts,
        });
        if (active) {
          setLightHtml(light);
          setDarkHtml(dark);
        }
      } catch (e) {
        console.warn("Shiki highlight failed:", e);
      }
    })();
    return () => {
      active = false;
    };
  }, [data.code, data.ssrDark, data.ssrLight]);

  const lines = data.code.split("\n");
  const commonFont = "font-mono text-[13px] leading-[20px]";

  // Plain-text fallback rendered while Shiki loads — avoids invisible flash
  const plainFallback = (
    <pre className="m-0 bg-transparent text-foreground whitespace-pre">{data.code}</pre>
  );

  return (
    <div className="relative group rounded-lg max-w-full mx-auto overflow-hidden border border-(--alxpro-terminal-border)">
      {!data.showHeader && (
        <div className="absolute top-[13px] right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-[10px] bg-(--alxpro-terminal-header) border border-(--alxpro-terminal-border)">
          <CopyButton getText={() => data.code} />
        </div>
      )}

      {/* Header */}
      {data.showHeader && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-(--alxpro-terminal-border) bg-(--alxpro-terminal-header)">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 text-paragraph">{getFileIcon(data.fileIcon)}</span>
            <span className={`${commonFont} text-paragraph truncate text-xs font-sans`}>
              {data.filename}
            </span>
          </div>
          <CopyButton getText={() => data.code} />
        </div>
      )}

      {/* Body */}
      <div className="relative flex w-full overflow-x-auto bg-(--alxpro-terminal-background) focus:outline-none! focus-visible:outline-none! focus:ring-0! focus-visible:ring-0!">
        {/* Line numbers */}
        <div className={`hidden sm:flex flex-col pt-5 pb-5 shrink-0 select-none ${commonFont}`}>
          {lines.map((_: string, i: number) => {
            const hl = data.highlightedLines?.includes(i);
            return (
              <div
                key={i}
                className={`pl-4 pr-3 text-right border-l-2 ${
                  hl
                    ? "border-(--alxpro-ui-accent) bg-(--alxpro-ui-line-highlight) text-(--alxpro-terminal-muted)"
                    : "border-transparent text-paragraph"
                }`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>

        {/* Grid stack */}
        <div className={`relative min-w-max grid grid-cols-1 grid-rows-1 flex-1 ${commonFont}`}>
          {/* Layer 0 — highlight strip */}
          <div className="col-start-1 row-start-1 pt-5 pb-5 pointer-events-none select-none flex flex-col z-0">
            {lines.map((_: string, i: number) => {
              const hl = data.highlightedLines?.includes(i);
              return (
                <div
                  key={i}
                  className={`w-full min-h-[20px] ${hl ? "bg-(--alxpro-ui-line-highlight) border-l-2 border-(--alxpro-ui-accent) sm:border-none" : ""}`}
                />
              );
            })}
          </div>

          {/* Layer 1 — Shiki light (hidden in dark mode) */}
          <div
            className={`col-start-1 row-start-1 pt-5 pb-5 pr-4 pl-4 sm:pl-2 whitespace-pre overflow-visible min-w-max z-10 dark:hidden
              [&>pre]:bg-transparent! [&>pre]:p-0! [&>pre]:m-0! [&>pre]:focus:outline-none! [&>pre]:focus-visible:outline-none! [&>pre]:focus:ring-0! [&>pre]:focus-visible:ring-0!
              [&>pre]:font-mono! [&>pre]:text-[13px]! [&>pre]:leading-[20px]! [&>pre]:whitespace-pre!
              [&>pre>code]:font-mono! [&>pre>code]:text-[13px]! [&>pre>code]:leading-[20px]! [&>pre>code]:whitespace-pre! [&>pre>code]:block!
              ${commonFont}`}
          >
            {/* FIX: only render lightHtml here, with plain fallback while loading */}
            {lightHtml ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(lightHtml) }} />
            ) : (
              plainFallback
            )}
          </div>

          {/* Layer 1 — Shiki dark (hidden in light mode) */}
          <div
            className={`col-start-1 row-start-1 pt-5 pb-5 pr-4 pl-4 sm:pl-2 whitespace-pre overflow-visible min-w-max z-10 hidden dark:block
              [&>pre]:bg-transparent! [&>pre]:p-0! [&>pre]:m-0! [&>pre]:focus:outline-none! [&>pre]:focus-visible:outline-none! [&>pre]:focus:ring-0! [&>pre]:focus-visible:ring-0!
              [&>pre]:font-mono! [&>pre]:text-[13px]! [&>pre]:leading-[20px]! [&>pre]:whitespace-pre!
              [&>pre>code]:font-mono! [&>pre>code]:text-[13px]! [&>pre>code]:leading-[20px]! [&>pre>code]:whitespace-pre! [&>pre>code]:block!
              ${commonFont}`}
          >
            {/* FIX: only render darkHtml here, with plain fallback while loading */}
            {darkHtml ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(darkHtml) }} />
            ) : (
              plainFallback
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HTML chunk (everything that isn't a custom block) ───────────────────────

function HtmlChunk({ html }: { html: string }) {
  return (
    <div
      className="
        [&_strong]:font-bold [&_strong]:text-paragraph
        [&_b]:font-bold [&_b]:text-paragraph
        [&_em]:italic [&_i]:italic

        [&_.ProseMirror_p]:leading-6.5
        [&_.ProseMirror_li]:leading-6.5
        [&_.ProseMirror_blockquote]:leading-6.5
        [&_[data-type='file-code-block']]:my-12
        [&_[data-type='file-code-block']:has(+figcaption)]:mb-0
        [&_table]:my-12
        [&_table:has(+figcaption)]:mb-0


        [&_ul]:pl-4 [&_ul]:list-disc  [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 post-content
        [&_ol]:pl-4 [&_ol]:list-decimal [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-2


        [&_h1]:text-3xl    [&_h1]:font-black    [&_h1]:text-black dark:[&_h1]:text-white [&_h1]:leading-tight [&_h1]:mb-6 [&_h1]:mt-24
        [&_h2]:text-2xl    [&_h2]:font-bold     [&_h2]:text-black dark:[&_h2]:text-white [&_h2]:mb-3 [&_h2]:mt-14
        [&_p]:my-6 []

        [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
        [&_pre_code]:bg-transparent [&_pre_code]:p-0

        [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-6
        [&_blockquote]:border-[#EAEAEA] dark:[&_blockquote]:border-[#1E1E1E]

        [&_hr]:my-8 [&_hr]:border-t-2 [&_hr]:border-[#EAEAEA] dark:[&_hr]:border-[#1E1E1E]

        [&_a]:text-primary [&_a:hover]:underline

        [&_table]:table-fixed [&_table]:my-12 [&_table]:rounded-xl [&_table]:py-2 [&_table]:px-4 [&_table]:relative 
        [&_table]:border-separate [&_table]:border-spacing-0 [&_table]:[scrollbar-width:none] [&_table]:[-ms-overflow-style:none] [&_table]:[&::-webkit-scrollbar]:hidden
        [&_table]:flex [&_table]:w-full [&_table]:overflow-x-auto [&_table]:overflow-y-hidden  [&_table]:justify-center-safe [&_colgroup]:hidden [&_col]:hidden
        [&_table]:mask-[linear-gradient(to_right,transparent_0%,black_3%,black_97%,transparent_100%)]
        [&_table]:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_3%,black_97%,transparent_100%)]
        [&_td]:min-w-[150px]
        [&_th]:min-w-[150px]

        [&_td]:h-20 [&_th]:h-20


        [&_th]:border-t [&_th]:border-l [&_th]:border-[#EAEAEA] dark:[&_th]:border-[#1E1E1E]
        [&_td]:border-t [&_td]:border-l [&_td]:border-[#EAEAEA] dark:[&_td]:border-[#1E1E1E]
        [&_tr_th:last-child]:border-r [&_tr_td:last-child]:border-r
        [&_tr:last-child_td]:border-b [&_tr:last-child_th]:border-b

        [&_tr:first-child_th:first-child]:rounded-tl-xl [&_tr:first-child_td:first-child]:rounded-tl-xl
        [&_tr:first-child_th:last-child]:rounded-tr-xl  [&_tr:first-child_td:last-child]:rounded-tr-xl
        [&_tr:last-child_th:first-child]:rounded-bl-xl  [&_tr:last-child_td:first-child]:rounded-bl-xl
        [&_tr:last-child_th:last-child]:rounded-br-xl   [&_tr:last-child_td:last-child]:rounded-br-xl

        [&_th]:bg-[#FAFAFA] dark:[&_th]:bg-black [&_th]:font-bold [&_th]:align-middle [&_th]:pl-4 [&_th]:text-left
        [&_td]:bg-white dark:[&_td]:bg-[#0A0A0A] [&_td]:align-middle [&_td]:pl-4 [&_td]:text-left
      "
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}

// ─── Parser ───────────────────────────────────────────────────────────────────

type PostNode =
  | { kind: "html"; html: string }
  | { kind: "terminal"; data: TerminalData; caption?: string }
  | { kind: "file"; data: FileData; caption?: string };

function parsePostHtml(html: string): PostNode[] {
  if (typeof window === "undefined") return [{ kind: "html", html }];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes: PostNode[] = [];
  let htmlBuffer = "";
  // track nodes to skip instead of calling .remove()
  const skipNodes = new Set<Node>();

  const flush = () => {
    if (htmlBuffer.trim()) {
      nodes.push({ kind: "html", html: htmlBuffer });
      htmlBuffer = "";
    }
  };

  Array.from(doc.body.childNodes).forEach((child) => {
    // skip nodes claimed as captions
    if (skipNodes.has(child)) return;

    if (child.nodeType !== Node.ELEMENT_NODE) {
      htmlBuffer += (child as Text).textContent ?? "";
      return;
    }

    const el = child as Element;

    // ── Terminal block ────────────────────────────────────────────────────────
    if (el.getAttribute("data-type") === "terminal-block") {
      flush();
      const mgr = (el.getAttribute("data-package-manager") ?? "npm") as Manager;
      const live = el.textContent ?? "";
      const npm = mgr === "npm" ? live : (el.getAttribute("data-npm-content") ?? "");
      const pnpm = mgr === "pnpm" ? live : (el.getAttribute("data-pnpm-content") ?? "");
      const yarn = mgr === "yarn" ? live : (el.getAttribute("data-yarn-content") ?? "");
      const bun = mgr === "bun" ? live : (el.getAttribute("data-bun-content") ?? "");
      const showHeader = el.getAttribute("data-show-header") !== "false";

      let caption: string | undefined;
      const next = el.nextElementSibling;
      if (next?.tagName === "FIGCAPTION") {
        caption = next.outerHTML;
        skipNodes.add(next); // mark for skip instead of .remove()
      }

      nodes.push({
        kind: "terminal",
        data: { activeManager: mgr, npm, pnpm, yarn, bun, showHeader },
        caption,
      });
      return;
    }

    // ── File code block ───────────────────────────────────────────────────────
    if (
      (el.tagName === "PRE" && el.getAttribute("data-type") === "file-code-block") ||
      (el.tagName === "FIGURE" && el.querySelector('[data-type="file-code-block"]'))
    ) {
      flush();
      const pre = el.tagName === "FIGURE" ? el.querySelector('[data-type="file-code-block"]') : el;
      const codeEl = pre?.querySelector("code");

      let highlightedLines: number[] = [];
      try {
        const raw = el.getAttribute("data-highlighted-lines") ?? "[]";
        const parsed = JSON.parse(raw);
        highlightedLines = Array.isArray(parsed) ? parsed : JSON.parse(parsed);
      } catch {
        /* empty array fallback */
      }

      let caption: string | undefined;
      if (el.tagName === "FIGURE") {
        const fig = el.querySelector("figcaption");
        if (fig) caption = fig.outerHTML;
        // No skip needed — figcaption is inside the FIGURE, not a sibling
      } else {
        const next = el.nextElementSibling;
        if (next?.tagName === "FIGCAPTION") {
          caption = next.outerHTML;
          skipNodes.add(next); // mark for skip instead of .remove()
        }
      }

      nodes.push({
        kind: "file",
        data: {
          showHeader: el.getAttribute("data-show-header") !== "false",
          filename: el.getAttribute("data-filename") ?? "example.tsx",
          fileIcon: el.getAttribute("data-file-icon") ?? "tsx",
          highlightedLines,
          code: codeEl?.textContent ?? "",
          // will be non-null when server injected them
          ssrLight: el.getAttribute("data-shiki-light")
            ? decodeURIComponent(el.getAttribute("data-shiki-light")!)
            : null,
          ssrDark: el.getAttribute("data-shiki-dark")
            ? decodeURIComponent(el.getAttribute("data-shiki-dark")!)
            : null,
        },
        caption,
      });
      return;
    }

    // ── Everything else ───────────────────────────────────────────────────────
    htmlBuffer += el.outerHTML;
  });

  flush();
  return nodes;
}

// ─── PostContent ──────────────────────────────────────────────────────────────

interface PostContentProps {
  html: string;
  className?: string;
}

export function PostContent({ html, className = "" }: PostContentProps) {
  const [mounted, setMounted] = useState(false);
  const [nodes, setNodes] = useState<PostNode[]>([]);
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(false);
    const parsed = parsePostHtml(html);
    setNodes(parsed);
    setMounted(true);
  }, [html]);

  const base = `leading-relaxed text-paragraph break-words w-full ${className}`;

  if (!mounted) {
    return (
      <div
        className={base}
        style={{ visibility: "hidden" }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
    );
  }

  return (
    <article ref={articleRef} className={base}>
      {nodes.map((node, i) => {
        if (node.kind === "html") return <HtmlChunk key={i} html={node.html} />;
        if (node.kind === "terminal")
          return (
            <div key={i} className="my-12">
              <TerminalBlock data={node.data} />
              {node.caption && (
                <div
                  className="my-4 text-sm italic text-paragraph text-center"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(node.caption) }}
                />
              )}
            </div>
          );
        if (node.kind === "file")
          return (
            <div key={i} className="my-12">
              <FileCodeBlock data={node.data} />
              {node.caption && (
                <div
                  className="my-4 text-sm italic text-paragraph text-center"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(node.caption) }}
                />
              )}
            </div>
          );
        return null;
      })}
    </article>
  );
}
