import { Extension } from "@tiptap/core";

export const ShortcutsExtension = Extension.create({
  name: "shortcuts",
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      // HISTORY
      "Mod-z": () => this.editor.chain().focus().undo().run(),
      "Mod-Shift-z": () => this.editor.chain().focus().redo().run(),

      // INLINE
      "Mod-b": () => this.editor.chain().focus().toggleBold().run(),
      "Mod-i": () => this.editor.chain().focus().toggleItalic().run(),

      // BADGE
      "Mod-m": () => {
        if (!this.editor.commands.toggleBadge) return false;
        return this.editor.chain().focus().toggleBadge().run();
      },

      "Mod-Shift-a": () => {
        window.dispatchEvent(new CustomEvent("open-link-dialog"));
        return true;
      },
      // BLOCKS
      "Mod-Alt-1": () => this.editor.chain().focus().toggleHeading({ level: 1 }).run(),

      "Mod-Alt-2": () => this.editor.chain().focus().toggleHeading({ level: 2 }).run(),

      "Mod-Alt-p": () => this.editor.chain().focus().setParagraph().run(),

      "Mod-Alt-c": () => this.editor.chain().focus().toggleCaption().run(),

      "Mod-Shift-c": () => this.editor.chain().focus().toggleCallout().run(),

      // LISTS
      "Mod-Shift-8": () => this.editor.chain().focus().toggleBulletList().run(),

      "Mod-Shift-7": () => this.editor.chain().focus().toggleOrderedList().run(),

      // ALIGNMENT
      "Mod-Shift-l": () => this.editor.chain().focus().setTextAlign("left").run(),

      "Mod-Shift-e": () => this.editor.chain().focus().setTextAlign("center").run(),

      "Mod-Shift-r": () => this.editor.chain().focus().setTextAlign("right").run(),

      "Mod-Shift-j": () => this.editor.chain().focus().setTextAlign("justify").run(),
    };
  },
});
