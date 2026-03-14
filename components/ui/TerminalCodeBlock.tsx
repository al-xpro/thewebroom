"use client";

import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { Terminal, Copy, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const managers = ["npm", "pnpm", "yarn"];

export default function TerminalCodeBlockComponent({
  node,
  editor,
  getPos,
}: any) {
  const [copied, setCopied] = useState(false);

  const switchManager = (targetManager: string) => {
    if (targetManager === node.attrs.packageManager) return;

    editor.commands.command(({ tr, state, dispatch }: any) => {
      const pos = getPos();
      if (typeof pos !== "number") return false;

      const currentNode = state.doc.nodeAt(pos);
      if (!currentNode) return false;

      const currentManager = currentNode.attrs.packageManager;
      const currentText = currentNode.textContent;
      const targetContent = currentNode.attrs[`${targetManager}Content`] || "";

      //  1. Capture cursor position RELATIVE to node
      const { from } = state.selection;
      const relativeOffset = from - (pos + 1);

      if (dispatch) {
        //  2. Save current text into its slot
        tr.setNodeMarkup(pos, undefined, {
          ...currentNode.attrs,
          [`${currentManager}Content`]: currentText,
          packageManager: targetManager,
        });

        const contentStart = pos + 1;
        const contentEnd = pos + currentNode.nodeSize - 1;

        //  3. Replace content
        if (targetContent.length > 0) {
          tr.replaceWith(contentStart, contentEnd, state.schema.text(targetContent));
        } else {
          tr.delete(contentStart, contentEnd);
        }

        //  4. Restore caret (clamp to new content length)
        const newOffset = Math.min(relativeOffset, targetContent.length);
        const newPos = contentStart + newOffset;

        tr.setSelection(state.selection.constructor.near(tr.doc.resolve(newPos)));
      }

      return true;
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // 2. VISUAL RENDERING
  // We use CSS Grid stacking to ensure the Visual Layer and Editor Layer match perfectly
  const renderStyled = () => {
    const text = node.textContent || "";
    // If empty, render a placeholder so height doesn't collapse
    if (!text)
      return (
        <div className="pointer-events-none opacity-0">
          <br />
        </div>
      );

    return text.split("\n").map((line: string, i: number) => {
      const match = line.match(/^(npm|pnpm|yarn|npx|cd|git|rm|mv|touch|mkdir|ls|echo|cat)\b/);

      if (!match) {
        return (
          <div key={i} className="text-[#397C3B] dark:text-[#58C760]">
            {line || <br />}
          </div>
        );
      }

      const prefix = match[0];
      const rest = line.slice(prefix.length);

      return (
        <div key={i}>
          <span className="text-[#7200C4] dark:text-[#B675F1]">{prefix}</span>
          <span className="text-[#397C3B] dark:text-[#58C760]">{rest}</span>
        </div>
      );
    });
  };

  // Shared typography for exact alignment
  const commonFont = "font-mono text-[13px] leading-[20px]";

  return (
    <NodeViewWrapper className="rounded-lg max-w-full mx-auto overflow-hidden border border-[#EAEAEA] dark:border-[#1E1E1E]">
      {/* HEADER */}
      <div
        contentEditable={false}
        className="flex items-center justify-between px-3.5 sm:px-4 py-2 border-b border-[#EAEAEA] dark:border-[#1E1E1E] bg-[#FAFAFA] dark:bg-black select-none"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Terminal className="size-4 text-neutral-500" />
          <div className="flex gap-1 text-xs font-mono">
            {managers.map((manager) => (
              <button
                key={manager}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  switchManager(manager);
                }}
                className={`px-1 sm:px-2 py-0.5 rounded transition cursor-pointer ${node.attrs.packageManager === manager ? "bg-black text-white dark:bg-white dark:text-black" : "dark:bg-[#181818] bg-[#E8E8E8]"}`}
              >
                {manager}
              </button>
            ))}
          </div>
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

      {/* BODY - GRID STACK */}
      {/* The grid ensures both children overlap exactly. `min-h` prevents collapse. */}
      <div
        className={`relative bg-white dark:bg-[#0A0A0A] w-full grid grid-cols-1 grid-rows-1 p-4 ${commonFont}`}
      >
        {/* Layer 1: Visuals (Bottom) */}
        <div className="col-start-1 row-start-1 pointer-events-none whitespace-pre overflow-x-auto">
          {renderStyled()}
        </div>

        {/* Layer 2: Editor (Top) */}
        <NodeViewContent
          as="div"
          className={`
            col-start-1 row-start-1 
            whitespace-pre overflow-x-auto outline-none 
            text-transparent caret-black dark:caret-white
            /* RESET TIPTAP MARGINS */
            [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:!font-inherit [&_pre]:!bg-transparent
            [&_div]:!m-0 [&_div]:!p-0
          `}
        />
      </div>
    </NodeViewWrapper>
  );
}
