import { Extension } from "@tiptap/core";

export const TableDeleteExtension = Extension.create({
  name: "tableDelete",
  
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        
        const { editor } = this;
        const { state } = editor;
        const { selection } = state;


        // Only when cursor is collapsed
        if (!selection.empty) {
          return false;
        }

        const { $from } = selection;

        // Check if we're inside a table
        let inTable = false;
        let cellNode = null;

        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          
          if (node.type.name === "table") {
            inTable = true;
          }
          
          if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
            cellNode = node;
          }
        }

        if (!inTable || !cellNode) {
          return false;
        }

        // Check if cell is empty
        const isEmpty = cellNode.textContent === "";


        if (!isEmpty) {
          return false;
        }

        const deleted = editor.commands.deleteTable();
        
        return deleted;
      },
    };
  },
});