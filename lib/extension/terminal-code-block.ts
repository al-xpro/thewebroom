import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import TerminalCodeBlockComponent from "@/components/ui/TerminalCodeBlock";

export const TerminalCodeBlock = Node.create({
  name: "terminalBlock",
  group: "block",
  content: "text*",
  defining: true,
  code: true,

  addAttributes() {
    return {
      packageManager: {
        default: "npm",
        parseHTML: (el) => el.getAttribute("data-package-manager") ?? "npm",
      },
      npmContent: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-npm-content") ?? "",
      },
      pnpmContent: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-pnpm-content") ?? "",
      },
      yarnContent: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-yarn-content") ?? "",
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="terminal-block"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Flush the live text of the active tab back into its slot
    const mgr = node.attrs.packageManager as string;
    const live = node.textContent;

    const npmContent  = mgr === "npm"  ? live : (node.attrs.npmContent  as string);
    const pnpmContent = mgr === "pnpm" ? live : (node.attrs.pnpmContent as string);
    const yarnContent = mgr === "yarn" ? live : (node.attrs.yarnContent as string);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "terminal-block",
        "data-package-manager": mgr,
        "data-npm-content":  npmContent,
        "data-pnpm-content": pnpmContent,
        "data-yarn-content": yarnContent,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TerminalCodeBlockComponent);
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        const node = $from.node($from.depth);
        if (node.textContent.length === 0) {
          return editor.commands.deleteNode("terminalBlock");
        }
        return false;
      },
    };
  },
});

