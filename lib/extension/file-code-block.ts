import { ReactNodeViewRenderer } from "@tiptap/react";
import FileCodeBlockComponent from "@/components/ui/FileCodeBlock";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { mergeAttributes } from "@tiptap/core";

import { createLowlight } from "lowlight";
import ts from "highlight.js/lib/languages/typescript";
import js from "highlight.js/lib/languages/javascript";

const lowlight = createLowlight();
lowlight.register("ts", ts);
lowlight.register("tsx", ts);
lowlight.register("js", js);

export const FileCodeBlock = CodeBlockLowlight.extend({
  name: "fileCodeBlock",

  addAttributes() {
    return {
      // Keep parent attributes (language, etc.) but override with our own
      ...this.parent?.(),
      showHeader: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-show-header") !== "false",
        renderHTML: (attrs) => ({ "data-show-header": String(attrs.showHeader) }),
      },
      filename: {
        default: "app/example.tsx",
        parseHTML: (el) => el.getAttribute("data-filename") ?? "app/example.tsx",
        renderHTML: (attrs) => ({ "data-filename": attrs.filename }),
      },
      language: {
        default: "tsx",
        parseHTML: (el) => el.getAttribute("data-language") ?? "tsx",
        renderHTML: (attrs) => ({ "data-language": attrs.language }),
      },
      fileIcon: {
        default: "tsx",
        parseHTML: (el) => el.getAttribute("data-file-icon") ?? "tsx",
        renderHTML: (attrs) => ({ "data-file-icon": attrs.fileIcon }),
      },
      highlightedLines: {
        default: [],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-highlighted-lines");
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-highlighted-lines": JSON.stringify(
            Array.isArray(attrs.highlightedLines) ? attrs.highlightedLines : []
          ),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'pre[data-type="file-code-block"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, {
        "data-type": "file-code-block",
        "data-show-header": String(node.attrs.showHeader),
      }),
      ["code", { class: `language-${node.attrs.language}` }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileCodeBlockComponent);
  },

  addKeyboardShortcuts() {
    const indent = "  ";

    return {
      Tab: ({ editor }) => {
        if (!editor.isActive("fileCodeBlock")) return false;

        const { state, dispatch } = editor.view;
        const { $from, from, to } = state.selection;

        // Get start of first line
        const start = $from.start();

        // Get end of last line
        const end = state.doc.resolve(to).end();

        const text = state.doc.textBetween(start, end, "\n");

        const indented = text
          .split("\n")
          .map((line) => indent + line)
          .join("\n");

        dispatch(state.tr.insertText(indented, start, end));
        return true;
      },

      "Shift-Tab": ({ editor }) => {
        if (!editor.isActive("fileCodeBlock")) return false;

        const { state, dispatch } = editor.view;
        const { $from, to } = state.selection;

        const start = $from.start();
        const end = state.doc.resolve(to).end();

        const text = state.doc.textBetween(start, end, "\n");

        const outdented = text
          .split("\n")
          .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
          .join("\n");

        dispatch(state.tr.insertText(outdented, start, end));
        return true;
      },
    };
  },
}).configure({ lowlight });
