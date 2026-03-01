"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Button } from "./button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Code2,
  Undo,
  Redo,
  Terminal,
  Tag,
  MessageSquareQuote,
  TableIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FileCodeBlock } from "@/lib/extension/file-code-block";
import { TerminalCodeBlock } from "@/lib/extension/terminal-code-block";
import { Badge } from "@/lib/extension/badge";
import { BiParagraph } from "react-icons/bi";
import { Caption } from "@/lib/extension/caption";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { TableDeleteExtension } from "@/lib/extension/table-delete";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Input } from "./input";
import { LimitTableRows } from "@/lib/extension/limit-table-rows";

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string, html: string) => void;
  placeholder?: string;
  hasError?: boolean;
  name?: string;
  id?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  hasError = false,
  name,
  id,
}: RichTextEditorProps) {
  const [, forceUpdate] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [isLinkExsists, setIsLinkExists] = useState(false);

  // Table Configuration State
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [withHeaderRow, setWithHeaderRow] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        link: false,
      }),
      FileCodeBlock,
      TerminalCodeBlock,
      Badge,
      Caption,
      Table.configure({
        resizable: false,
        allowTableNodeSelection: false,
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "bg-[#FAFAFA] dark:bg-black font-bold text-black dark:text-white p-2 text-left",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "bg-white dark:bg-[#0A0A0A] p-2 text-left text-paragraph",
        },
      }),
      TableDeleteExtension,
      LimitTableRows,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph", "caption"],
      }),
    ],
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        ...(name ? { name } : {}),
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    content: value ?? "",
    onSelectionUpdate: () => forceUpdate((n) => n + 1),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange?.(text, html);
    },
    // Required for SSR — prevents TipTap from rendering on the server
    // which causes hydration mismatches in both Chrome and Safari.
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Handle Focus for "Input Fields" inside NodeViews
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" && editorRef.current?.contains(target)) {
        setIsInputFocused(true);
      }
    };
    const handleFocusOut = () => setIsInputFocused(false);

    const el = editorRef.current;
    if (el) {
      el.addEventListener("focusin", handleFocusIn);
      el.addEventListener("focusout", handleFocusOut);
    }
    return () => {
      if (el) {
        el.removeEventListener("focusin", handleFocusIn);
        el.removeEventListener("focusout", handleFocusOut);
      }
    };
  }, []);

  if (!editor) return null;

  const isFormattingDisabled =
    editor.isActive("fileCodeBlock") ||
    editor.isActive("terminalBlock") ||
    editor.isActive("table");

  // Do NOT gate on isEditorFocused — in Safari, blur fires before the button click,
  // so isEditorFocused is already false when the handler runs, disabling the button
  // and swallowing the click. Keyboard shortcuts worked because they bypass disabled.
  // Only disable when the action is genuinely impossible (wrong node type).
  const isToolbarDisabled = isFormattingDisabled;

  const handleRowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) setTableRows(1);
    else if (val > 20) setTableRows(20);
    else if (val < 1) setTableRows(1);
    else setTableRows(val);
  };

  const handleColChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) setTableCols(1);
    else if (val > 10) setTableCols(10);
    else if (val < 1) setTableCols(1);
    else setTableCols(val);
  };

  const isTableActive = editor.isActive("table");

  const insertCustomTable = () => {
    editor.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow }).run();
    setShowTableMenu(false);
  };

  const handleToggleLink = () => {
    if (!editor || isFormattingDisabled) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    setLinkValue(previousUrl ?? "https://");
    setIsLinkOpen(true);
    setIsLinkExists(previousUrl ? true : false);
  };

  const handleConfirmLink = () => {
    if (!editor) return;
    if (!linkValue.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkValue }).run();
    }
    setIsLinkOpen(false);
  };

  return (
    <div
      ref={editorRef}
      className={`border rounded-lg overflow-hidden ${
        hasError
          ? "border-[#CB2A2E] dark:border-[#FF6166] hover:border-[#CB2A2E] hover:dark:border-[#FF6166] hover:outline-[#F9B9BA] hover:dark:outline-[#822125] outline-[#FFE6E6] dark:outline-[#561A1E] focus:outline-[#FFE6E6] focus:dark:outline-[#561A1E] outline-3 focus:border-[#CB2A2E] focus:dark:border-[#FF6166]"
          : "border-[#EAEAEA] dark:border-[#1E1E1E]"
      }`}
    >
      <div className="flex items-center gap-1 sm:gap-2 bg-white/50 dark:bg-black/50 p-2 flex-wrap border-b border-[#EAEAEA] dark:border-[#1E1E1E]">
        <Button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          variant="outline"
          size="sm"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          variant="outline"
          size="sm"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="hidden sm:block w-px h-6 bg-border" />

        <Button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive("heading", { level: 1 }) ? "default" : "outline"}
          size="sm"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive("heading", { level: 2 }) ? "default" : "outline"}
          size="sm"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive("heading", { level: 3 }) ? "default" : "outline"}
          size="sm"
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive("paragraph") ? "default" : "outline"}
          size="sm"
          title="Paragraph"
        >
          <BiParagraph className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().toggleCaption().run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive("caption") ? "default" : "outline"}
          size="sm"
          title="Caption"
        >
          <MessageSquareQuote className="h-4 w-4" />
        </Button>

        <div className="hidden sm:block w-px h-6 bg-border" />

        <Button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive("bold") ? "default" : "outline"}
          size="sm"
          title="Bold (⌘B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive("italic") ? "default" : "outline"}
          size="sm"
          title="Italic (⌘I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={handleToggleLink}
          disabled={isToolbarDisabled}
          variant={editor.isActive("link") ? "default" : "outline"}
          size="sm"
          title="Link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().toggleBadge().run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive("badge") ? "default" : "outline"}
          size="sm"
          title="Tag"
        >
          <Tag className="h-4 w-4" />
        </Button>

        <div className="hidden sm:block w-px h-6 bg-border" />

        <Button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          variant={editor.isActive("bulletList") ? "default" : "outline"}
          disabled={isToolbarDisabled}
          size="sm"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          variant={editor.isActive("orderedList") ? "default" : "outline"}
          disabled={isToolbarDisabled}
          size="sm"
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="hidden sm:block w-px h-6 bg-border" />

        <Button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive({ textAlign: "left" }) ? "default" : "outline"}
          size="sm"
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive({ textAlign: "center" }) ? "default" : "outline"}
          size="sm"
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive({ textAlign: "right" }) ? "default" : "outline"}
          size="sm"
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive({ textAlign: "justify" }) ? "default" : "outline"}
          size="sm"
          title="Align Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <div className="hidden sm:block w-px h-6 bg-border" />

        <Button
          type="button"
          onClick={() => editor.chain().focus().insertContent({ type: "fileCodeBlock" }).run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive("fileCodeBlock") ? "default" : "outline"}
          size="sm"
          title="Code Block"
        >
          <Code2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => editor.chain().focus().insertContent({ type: "terminalBlock" }).run()}
          disabled={isToolbarDisabled}
          variant={editor.isActive("terminalBlock") ? "default" : "outline"}
          size="sm"
          title="Terminal Block"
        >
          <Terminal className="h-4 w-4" />
        </Button>

        <div className="relative">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                disabled={isToolbarDisabled}
                variant={isTableActive || editor.isActive("table") ? "default" : "outline"}
                size="sm"
                title="Custom Table"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="center" className="relative left-9 sm:left-0 min-w-[320px]">
              <div className="absolute top-0 mt-2 z-50 p-3 bg-[#F6F6F6] dark:bg-[#060606] border border-[#EAEAEA] dark:border-[#1E1E1E] rounded-lg shadow-xl w-54 flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-black dark:text-white">Create Table</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                    <label
                      htmlFor="rows"
                      className="text-[10px] uppercase font-bold text-paragraph"
                    >
                      Rows
                    </label>
                    <input
                      type="number"
                      id="rows"
                      min="1"
                      max="20"
                      value={tableRows}
                      onChange={handleRowChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRowChange(e as any);
                        }
                      }}
                      className="w-full text-sm p-1.5 border border-[#EAEAEA] dark:border-[#1E1E1E] rounded bg-white dark:bg-black focus-within:ring-3 focus-within:ring-[#ffc7bb] dark:focus-within:ring-[#660900] focus-visible:border-primary dark:focus-visible:border-primary focus-within:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label
                      htmlFor="cols"
                      className="text-[10px] uppercase font-bold text-paragraph"
                    >
                      Cols
                    </label>
                    <input
                      type="number"
                      id="cols"
                      min="2"
                      max="6"
                      value={tableCols}
                      onChange={handleColChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleColChange(e as any);
                        }
                      }}
                      className="w-full text-sm p-1.5 border border-[#EAEAEA] dark:border-[#1E1E1E] rounded bg-white dark:bg-black focus-within:ring-3 focus-within:ring-[#ffc7bb] dark:focus-within:ring-[#660900] focus-visible:border-primary dark:focus-visible:border-primary focus-within:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-[#EAEAEA] dark:border-[#1E1E1E]">
                  <label
                    htmlFor="checkbox"
                    className="flex items-center gap-2 text-sm cursor-pointer transition-colors w-26"
                  >
                    <Checkbox
                      checked={withHeaderRow}
                      id="checkbox"
                      onCheckedChange={(checked) => setWithHeaderRow(checked === true)}
                      className="accent-primary cursor-pointer"
                    />
                    Header Row
                  </label>
                </div>
                <Button
                  type="button"
                  onClick={insertCustomTable}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      insertCustomTable();
                    }
                  }}
                  className="w-full"
                  variant="secondary"
                >
                  Insert Table
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <EditorContent
        editor={editor}
        id={id}
        name={name}
        onMouseDown={() => editor.chain().focus().run()}
        className="
          relative prose prose-neutral dark:prose-invert max-w-none
          px-4 py-6 h-[500px] overflow-y-auto cursor-text text-paragraph
          bg-white dark:bg-black
          focus:outline-none

          [&_.ProseMirror]:outline-none
          [&_.ProseMirror>*+*]:mt-3

          [&_.ProseMirror_ul]:pl-4
          [&_.ProseMirror_ul]:list-disc
          [&_.ProseMirror_ul]:flex
          [&_.ProseMirror_ul]:flex-col
          [&_.ProseMirror_ul]:gap-2
          [&_.ProseMirror_ol]:pl-4
          [&_.ProseMirror_ol]:list-decimal
          [&_.ProseMirror_ol]:flex
          [&_.ProseMirror_ol]:flex-col
          [&_.ProseMirror_ol]:gap-2

          [&_.ProseMirror_h1]:text-3xl
          [&_.ProseMirror_h1]:font-black
          [&_.ProseMirror_h1]:text-black
          dark:[&_.ProseMirror_h1]:text-white
          [&_.ProseMirror_h1]:leading-tight
          [&_.ProseMirror_h1]:my-4

          [&_.ProseMirror_h2]:text-2xl
          [&_.ProseMirror_h2]:font-bold
          [&_.ProseMirror_h2]:text-black
          dark:[&_.ProseMirror_h2]:text-white
          [&_.ProseMirror_h2]:my-3

          [&_.ProseMirror_h3]:text-xl
          [&_.ProseMirror_h3]:font-semibold
          [&_.ProseMirror_h3]:text-black
          dark:[&_.ProseMirror_h3]:text-white
          [&_.ProseMirror_h3]:my-3

          [&_.ProseMirror_code]:bg-muted
          [&_.ProseMirror_code]:px-1
          [&_.ProseMirror_code]:py-0.5
          [&_.ProseMirror_code]:rounded
          [&_.ProseMirror_code]:text-sm
          [&_.ProseMirror_pre_code]:bg-transparent
          [&_.ProseMirror_pre_code]:p-0
          [&_.ProseMirror_blockquote]:border-l-4
          [&_.ProseMirror_blockquote]:pl-4
          [&_.ProseMirror_blockquote]:italic
          [&_.ProseMirror_blockquote]:my-6
          [&_.ProseMirror_blockquote]:border-black/10
          dark:[&_.ProseMirror_blockquote]:border-white/20

          [&_.ProseMirror_hr]:my-8
          [&_.ProseMirror_hr]:border-t-2
          [&_.ProseMirror_hr]:border-[#EAEAEA]
          dark:[&_.ProseMirror_hr]:border-[#1E1E1E]
          [&_.ProseMirror_a]:text-primary
          [&_.ProseMirror_a:hover]:underline
          hover:[&_.ProseMirror_a]:cursor-pointer

          [&_table]:table-fixed [&_table]:my-16 [&_table]:rounded-xl [&_table]:py-2 [&_table]:px-4 [&_table]:relative
          [&_table]:border-separate [&_table]:border-spacing-0
          [&_table]:flex [&_table]:w-full [&_table]:overflow-x-auto [&_table]:overflow-y-hidden [&_table]:justify-center-safe
          [&_table]:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_3%,black_97%,transparent_100%)]
          [&_table]:[mask-image:linear-gradient(to_right,transparent_0%,black_3%,black_97%,transparent_100%)]
          [&_table]:[scrollbar-width:none] [&_table]:[-ms-overflow-style:none] [&_table]:[&::-webkit-scrollbar]:hidden
          [&_td]:min-w-[150px] [&_td]:max-w-[150px]
          [&_th]:min-w-[150px] [&_th]:max-w-[150px]
          [&_td]:h-16 [&_th]:h-16

          [&_.ProseMirror_td]:min-w-[150px]
          [&_.ProseMirror_td]:max-w-[150px]
          [&_.ProseMirror_th]:min-w-[150px]
          [&_.ProseMirror_th]:max-w-[150px]

          [&_.ProseMirror_th]:border-t
          [&_.ProseMirror_th]:border-l
          [&_.ProseMirror_th]:border-[#EAEAEA]
          dark:[&_.ProseMirror_th]:border-[#1E1E1E]

          [&_.ProseMirror_td]:border-t
          [&_.ProseMirror_td]:border-l
          [&_.ProseMirror_td]:border-[#EAEAEA]
          dark:[&_.ProseMirror_td]:border-[#1E1E1E]

          [&_.ProseMirror_tr_th:last-child]:border-r
          [&_.ProseMirror_tr_td:last-child]:border-r

          [&_.ProseMirror_tr:last-child_td]:border-b
          [&_.ProseMirror_tr:last-child_th]:border-b

          [&_.ProseMirror_tr:first-child_th:first-child]:rounded-tl-xl
          [&_.ProseMirror_tr:first-child_td:first-child]:rounded-tl-xl
          [&_.ProseMirror_tr:first-child_th:last-child]:rounded-tr-xl
          [&_.ProseMirror_tr:first-child_td:last-child]:rounded-tr-xl
          [&_.ProseMirror_tr:last-child_th:first-child]:rounded-bl-xl
          [&_.ProseMirror_tr:last-child_td:first-child]:rounded-bl-xl
          [&_.ProseMirror_tr:last-child_th:last-child]:rounded-br-xl
          [&_.ProseMirror_tr:last-child_td:last-child]:rounded-br-xl

          [&_.ProseMirror_th]:bg-[#FAFAFA]
          dark:[&_.ProseMirror_th]:bg-black
          [&_.ProseMirror_th]:font-bold
          [&_.ProseMirror_th]:py-4
          [&_.ProseMirror_th]:align-middle
          [&_.ProseMirror_th]:text-center

          [&_.ProseMirror_td]:bg-white
          dark:[&_.ProseMirror_td]:bg-[#0A0A0A]
          [&_.ProseMirror_td]:py-4
          [&_.ProseMirror_td]:align-middle
          [&_.ProseMirror_td]:text-center
        "
      />

      <AlertDialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Edit Link</AlertDialogTitle>
            <AlertDialogDescription className="text-paragraph">
              Enter a new link for the selected text
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label htmlFor="link-url"></label>
          <Input
            id="link-url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="https://example.com"
          />
          <AlertDialogFooter>
            <AlertDialogCancel variant="secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLink}
              variant="secondary"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirmLink();
                }
              }}
            >
              Save
            </AlertDialogAction>
            {isLinkExsists && (
              <Button
                variant="destructive"
                onClick={() => {
                  editor?.chain().focus().unsetLink().run();
                  setIsLinkOpen(false);
                }}
                className="h-8.5"
              >
                Remove
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
