import { Extension } from "@tiptap/core";
import { splitBlock } from "prosemirror-commands";

export const AlignmentExtension = Extension.create({
  name: "alignment",
  priority: 10,

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state, view } = editor;
        const { $from } = state.selection;

        // Check all ancestor nodes to see if we're in a list
        let isInList = false;
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          if (
            node.type.name === "listItem" ||
            node.type.name === "bulletList" ||
            node.type.name === "orderedList"
          ) {
            isInList = true;
            break;
          }
        }

        // If in list, skip entirely and let TipTap's list extension handle it
        if (isInList) {
          return false;
        }

        const currentAlign = $from.parent.attrs.textAlign;

        // run default behavior safely (no recursion)
        const didSplit = splitBlock(state, view.dispatch);

        if (!didSplit) return false;

        if (currentAlign) {
          editor.commands.setTextAlign(currentAlign);
        }

        return true;
      },
    };
  },
});