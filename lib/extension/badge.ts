import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    badge: {
      toggleBadge: () => ReturnType;
    };
  }
}

export const Badge = Mark.create({
  name: "badge",
  priority: 1001,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (element) => ((element as HTMLElement).hasAttribute("data-badge") ? {} : false),
      },
      {
        tag: "code",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return el.closest("pre") ? false : {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-badge": "",
        class:
          "inline align-baseline mx-0.5 text-[length:inherit] px-1 rounded-md font-mono tracking-tight text-black dark:text-white bg-white dark:bg-[#0A0A0A] border border-[#EAEAEA] dark:border-[#1E1E1E] break-words",
        style: "background-color: #EAEAEA; border-color: #EAEAEA; color: #000; line-height: 1.5em;",

      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleBadge:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
    };
  },
});
