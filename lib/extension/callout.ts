import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "inline*",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-callout": "",
        class:
          "rounded-md px-4 py-3 my-6 bg-[#F2F2F2] dark:bg-[#191919] text-paragraph text-sm",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleCallout:
        () =>
        ({ editor, commands }) => {
          if (editor.isActive("callout")) {
            return commands.clearNodes();
          }
          return commands.setNode(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!editor.isActive("callout")) return false;

        const { state, dispatch } = editor.view;
        const { $from } = state.selection;
        const isEmpty = $from.parent.textContent === "";

        if (isEmpty) {
          // Replace the empty callout node with a paragraph
          const tr = state.tr.replaceRangeWith(
            $from.before(),
            $from.after(),
            state.schema.nodes.paragraph.create()
          );
          dispatch(tr);
          return true;
        }

        // Non-empty line: insert a hard break inside the callout
        return editor.commands.setHardBreak();
      },

      Escape: ({ editor }) => {
        if (!editor.isActive("callout")) return false;

        const { state, dispatch } = editor.view;
        const { $from } = state.selection;
        const tr = state.tr.replaceRangeWith(
          $from.before(),
          $from.after(),
          state.schema.nodes.paragraph.create(
            {},
            $from.parent.content.size > 0 ? $from.parent.content : undefined
          )
        );
        dispatch(tr);
        return true;
      },
    };
  },
});