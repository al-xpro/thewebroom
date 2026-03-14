import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    caption: {
      setCaption: () => ReturnType;
      toggleCaption: () => ReturnType;
    };
  }
}

export const Caption = Node.create({
  name: "caption",

  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: "figcaption" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figcaption",
      mergeAttributes(HTMLAttributes, {
        class: "text-xs text-paragraph mt-4 mb-12",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleCaption:
        () =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) {
            return commands.setParagraph();
          }
          return commands.setNode(this.name);
        },
    };
  },
});