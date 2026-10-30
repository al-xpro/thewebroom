import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import TerminalCodeBlockComponent from "@/components/ui/TerminalCodeBlock";
import { convertCommands, type PackageManager } from "@/lib/package-manager-command";

export const TerminalCodeBlock = Node.create({
  name: "terminalBlock",
  group: "block",
  content: "text*",
  defining: true,
  code: true,

  addAttributes() {
    return {
      showHeader: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-show-header") !== "false",
        renderHTML: (attrs) => ({ "data-show-header": String(attrs.showHeader) }),
      },
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
      bunContent: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-bun-content") ?? "",
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="terminal-block"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    // The tab being edited is the source: every other tab is generated from it (#104).
    const mgr = node.attrs.packageManager as PackageManager;
    const live = node.textContent;

    const npmContent = convertCommands(live, mgr, "npm");
    const pnpmContent = convertCommands(live, mgr, "pnpm");
    const yarnContent = convertCommands(live, mgr, "yarn");
    const bunContent = convertCommands(live, mgr, "bun");

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "terminal-block",
        "data-show-header": String(mgr === "npm" ? node.attrs.showHeader : node.attrs.showHeader),
        "data-package-manager": mgr,
        "data-npm-content": npmContent,
        "data-pnpm-content": pnpmContent,
        "data-yarn-content": yarnContent,
        "data-bun-content": bunContent,
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
