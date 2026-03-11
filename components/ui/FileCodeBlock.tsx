"use client";

import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { Copy, Check } from "lucide-react";
import { SiNextdotjs, SiReact } from "react-icons/si";
import { useState, useEffect } from "react";
import { highlighterPromise } from "@/lib/extension/shiki";
import { motion } from "framer-motion";
import { BiLogoTypescript, BiLogoJavascript } from "react-icons/bi";

export default function FileCodeBlockComponent({ node, updateAttributes }: any) {
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function normalizeLang(lang?: string) {
    if (!lang) return "tsx";

    const map: Record<string, string> = {
      typescriptreact: "tsx",
      javascriptreact: "jsx",
      typescript: "ts",
      javascript: "js",
    };

    return map[lang] ?? lang;
  }

  useEffect(() => {
    let isActive = true;
    async function highlight() {
      const highlighter = await highlighterPromise;

      let lang = normalizeLang(node.attrs.language);

      if (!highlighter.getLoadedLanguages().includes(lang)) {
        lang = "tsx";
      }

      const result = highlighter.codeToHtml(node.textContent || "", {
        lang,
        themes: { light: "vercel-light", dark: "vercel-dark" },
        defaultColor: false,
      });

      if (isActive) setHtml(result);
    }
    highlight();
    return () => {
      isActive = false;
    };
  }, [node.textContent, node.attrs.language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(node.textContent);
    setCopied(true);
  };

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1000);
    return () => clearTimeout(timeout);
  }, [copied]);

  // Handle toggling the line highlight
  const toggleHighlight = (index: number) => {
    const current: number[] = node.attrs.highlightedLines || [];

    if (current.includes(index)) {
      updateAttributes({
        highlightedLines: current.filter((i) => i !== index),
      });
    } else {
      updateAttributes({
        highlightedLines: [...current, index],
      });
    }
  };

  const getFileIcon = (lang: string) => {
    switch (lang) {
      case "ts":
        return <BiLogoTypescript className="size-4 scale-130" />;
      case "tsx":
        return <SiNextdotjs className="size-4 scale-110" />;
      case "js":
        return <BiLogoJavascript className="size-4 scale-130" />;
      case "jsx":
        return <SiReact className="size-4 scale-130" />;
      default:
        return null;
    }
  };

  const languages = ["ts", "tsx", "js", "jsx"];
  if (!mounted) return null;

  const commonFont = "font-mono text-[13px] leading-[20px]";
  const lines = node.textContent.split("\n");

  return (
    <NodeViewWrapper
      className="my-16 rounded-lg max-w-xl mx-auto overflow-hidden border border-[#EAEAEA] dark:border-[#1E1E1E]"
      data-tiptap-custom="file-code-block-wrapper"
      data-language={node.attrs.language}
      data-filename={node.attrs.filename}
      data-file-icon={node.attrs.fileIcon}
    >
      {/* HEADER */}
      <div
        contentEditable={false}
        className="flex items-center justify-between px-4 py-2 border-b border-[#EAEAEA] dark:border-[#1E1E1E] transition-colors duration-200 bg-[#FAFAFA] dark:bg-black"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            contentEditable={false}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const nextIcon =
                languages[(languages.indexOf(node.attrs.fileIcon) + 1) % languages.length];

              updateAttributes({ fileIcon: nextIcon });
            }}
            className="flex items-center justify-center cursor-pointer text-paragraph"
          >
            {getFileIcon(node.attrs.fileIcon)}
          </button>
          <input
            value={node.attrs.filename}
            name="code block"
            onChange={(e) => updateAttributes({ filename: e.target.value })}
            className="bg-transparent text-xs w-30 sm:w-60 outline-none text-paragraph focus:text-black dark:focus:text-white font-sans truncate"
          />
        </div>
        <button
          type="button"
          contentEditable={false}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCopy();
          }}
          className="p-2 rounded-md transition cursor-pointer hover:bg-[#EAEAEA] dark:hover:bg-[#1E1E1E]"
        >
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0.1, opacity: 1 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.1, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Check className="size-4 text-[#666666] dark:text-[#A0A0A0]" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ scale: 0.1, opacity: 1 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.1, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Copy className="size-4 text-[#666666] dark:text-[#A0A0A0]" />
            </motion.div>
          )}
        </button>
      </div>

      {/* BODY */}
      <div className="relative flex w-full overflow-x-auto transition-colors duration-200 bg-white dark:bg-[#0A0A0A]">
        {/* LINE NUMBERS COLUMN */}
        <div contentEditable={false} className={`flex flex-col pt-5 pb-5 shrink-0 ${commonFont}`}>
          {lines.map((_: string, i: number) => {
            const isHighlighted = node.attrs.highlightedLines?.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleHighlight(i)}
                className={`
                  pl-4 pr-3 text-right select-none transition-colors duration-100 outline-none
                  border-l-2 cursor-pointer
                  ${
                    isHighlighted
                      ? "border-[#0068D6] bg-[#EAF5FF] dark:border-[#52A8FF] dark:bg-[#0F233D] text-[#666666] dark:text-[#A0A0A0]"
                      : "border-transparent bg-transparent text-paragraph"
                  }
                `}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* CODE STACK (GRID) */}
        <div className="relative min-w-max grid grid-cols-1 grid-rows-1 flex-1">
          {/* LAYER 0: HIGHLIGHT BACKGROUND */}
          {/* This layer sits behind text and renders the color strip for the selected line */}
          <div
            className={`
            col-start-1 row-start-1 pt-5 pb-5 z-0
            pointer-events-none min-w-max! select-none
            flex flex-col
            ${commonFont}
          `}
          >
            {lines.map((_: string, i: number) => {
              const isHighlighted = node.attrs.highlightedLines?.includes(i);
              return (
                <div
                  key={i}
                  className={`
                    w-full min-h-[20px] transition-colors duration-100
                    ${isHighlighted ? "bg-[#EAF5FF] dark:bg-[#0F233D]" : "bg-transparent"}
                  `}
                />
              );
            })}
          </div>

          {/* LAYER 1: VISUALS (SHIKI) */}
          <div
            className={`
              shiki-block col-start-1 row-start-1 pt-5 pb-5 pr-4 pl-2 !bg-transparent z-10
              pointer-events-none whitespace-pre overflow-visible min-w-max [&>pre]:focus:outline-none! [&>pre]:focus-visible:outline-none! [&>pre]:focus:ring-0! [&>pre]:focus-visible:ring-0!
              [&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0 [&>pre]:!font-mono [&>pre]:!text-[13px] [&>pre]:!leading-[20px] [&>pre]:!whitespace-pre
              [&>pre>code]:!font-mono [&>pre>code]:!text-[13px] [&>pre>code]:!leading-[20px] [&>pre>code]:!whitespace-pre [&>pre>code]:!block
              ${commonFont}
            `}
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* LAYER 2: EDITOR (NodeViewContent) */}
          <NodeViewContent
            as="pre"
            data-tiptap-content-target="true"
            className={`
              col-start-1 row-start-1 pt-5 pb-5 pr-4 pl-2
              whitespace-pre outline-none min-w-max 
              text-transparent !bg-transparent z-20
              caret-black dark:caret-white
              !m-0 [&>pre]:focus:outline-none! [&>pre]:focus-visible:outline-none! [&>pre]:focus:ring-0! [&>pre]:focus-visible:ring-0!
              [&>code]:!m-0 [&>code]:!p-0 [&>code]:!font-mono [&>code]:!text-[13px] [&>code]:!leading-[20px] [&>code]:!bg-transparent [&>code]:!block [&>code]:!whitespace-pre
              ${commonFont}
            `}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
