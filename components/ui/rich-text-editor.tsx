"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Button } from "./button";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
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
  StickyNote,
  Pilcrow,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FileCodeBlock } from "@/lib/extension/file-code-block";
import { TerminalCodeBlock } from "@/lib/extension/terminal-code-block";
import { Badge } from "@/lib/extension/badge";
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
import { Callout } from "@/lib/extension/callout";
import { cn } from "@/lib/utils";
import { AlignmentExtension } from "@/lib/extension/alignment";
import { ShortcutsExtension } from "@/lib/extension/shortcuts";

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string, html: string) => void;
  placeholder?: string;
  hasError?: boolean;
  name?: string;
  id?: string;
  isMetaEditing?: boolean;
}

type ToolbarPosition = "top" | "left" | "right" | "bottom";

function getTextWithTablePlaceholder(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return "";

  let result = "";

  editor.state.doc.forEach((node) => {
    // Walk into tables — collect text from every cell
    if (node.type.name === "table") {
      node.forEach((row) => {
        row.forEach((cell) => {
          const text = cell.textContent.trim();
          if (text) result += text + " ";
        });
      });
      // Walk into code/terminal blocks — collect their text content
    } else if (node.type.name === "fileCodeBlock" || node.type.name === "terminalBlock") {
      const text = node.textContent.trim();
      if (text) result += text + " ";
    } else {
      const text = node.textContent;
      if (text.trim()) result += text + " ";
    }
  });

  return result.trim();
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing your story...",
  hasError = false,
  name,
  id,
  isMetaEditing = false,
}: RichTextEditorProps) {
  const [, forceUpdate] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [isLinkExsists, setIsLinkExists] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>("bottom");
  const [isToolbarPositionPopoverOpen, setIsToolbarPositionPopoverOpen] = useState(false);

  // Table Configuration State
  const [tableRows, setTableRows] = useState(2);
  const [tableCols, setTableCols] = useState(2);
  const [withHeaderRow, setWithHeaderRow] = useState(true);
  const [codeBlockShowHeader, setCodeBlockShowHeader] = useState(true);
  const [terminalShowHeader, setTerminalShowHeader] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        link: false,
        code: false,
        blockquote: false,
      }),
      FileCodeBlock,
      TerminalCodeBlock,
      Badge,
      Callout,
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
      AlignmentExtension,
      ShortcutsExtension,
      LimitTableRows,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph", "caption", "callout"],
      }),
    ],
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        ...(name ? { name } : {}),
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": "content-label",
        "aria-label": "content editor",
      },
    },
    content: value ?? "",
    onSelectionUpdate: () => forceUpdate((n) => n + 1),
    onUpdate: ({ editor }) => {
      forceUpdate((n) => n + 1);
      const html = editor.getHTML();
      const text = getTextWithTablePlaceholder(editor);
      onChange?.(text, html);
    },
    // Required for SSR — prevents TipTap from rendering on the server
    // which causes hydration mismatches in both Chrome and Safari.
    immediatelyRender: false,
  });

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor?.isActive("bold") ?? false,
      isItalic: ctx.editor?.isActive("italic") ?? false,
      isBadge: ctx.editor?.isActive("badge") ?? false,
    }),
  });

  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const isToolbarVertical = toolbarPosition === "left" || toolbarPosition === "right";

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

  useEffect(() => {
    requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;

      if (isToolbarVertical) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        setIsAtStart(scrollTop <= 0);
        setIsAtEnd(Math.ceil(scrollTop + clientHeight) >= scrollHeight - 1);
        return;
      }

      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setIsAtStart(scrollLeft <= 0);
      setIsAtEnd(Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 1);
    });
  }, [isToolbarVertical]);

  useEffect(() => {
    const handler = () => {
      if (!editor) return;

      const previousUrl = editor.getAttributes("link").href as string | undefined;
      setLinkValue(previousUrl ?? "https://");
      setIsLinkExists(!!previousUrl);
      setIsLinkOpen(true);
    };

    window.addEventListener("open-link-dialog", handler);
    return () => window.removeEventListener("open-link-dialog", handler);
  }, [editor]);

  if (!editor) return null;

  const isInTable = editor.isActive("table");
  const isFormattingDisabled = editor.isActive("fileCodeBlock") || editor.isActive("terminalBlock");

  // GLOBAL lock → title, subtitle, or nothing focused
  const isGloballyDisabled = isMetaEditing;
  // What each group can do
  const disableAllExceptUndoRedo = isGloballyDisabled;

  const disableBlockFormatting = disableAllExceptUndoRedo || isFormattingDisabled || isInTable;

  const disableInlineFormatting = disableAllExceptUndoRedo || isFormattingDisabled;

  const setSafeTableRows = (value: string) => {
    const val = parseInt(value);
    if (isNaN(val)) setTableRows(2);
    else if (val > 20) setTableRows(20);
    else if (val < 2) setTableRows(2);
    else setTableRows(val);
  };

  const setSafeTableCols = (value: string) => {
    const val = parseInt(value);
    if (isNaN(val)) setTableCols(2);
    else if (val > 10) setTableCols(10);
    else if (val < 2) setTableCols(2);
    else setTableCols(val);
  };

  const handleRowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSafeTableRows(e.target.value);
  };

  const handleColChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSafeTableCols(e.target.value);
  };

  const insertCustomTable = () => {
    editor.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow }).run();
  };

  const bodyValue = getTextWithTablePlaceholder(editor);

  const MAX_CHARS = 30000;

  const MIN_CHARS = 5000;

  function counterColor(current: number, max: number) {
    if (current > max) return "text-[#CB2A2E] dark:text-[#FF6166]";
    if (current < MIN_CHARS) return "text-[#CB2A2E] dark:text-[#FF6166]";
    if (current > max * 0.8) return "text-amber-500";
    return "text-paragraph";
  }

  function formatCount(n: number) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return n.toString();
  }

  // Get popover alignment based on toolbar position
  const getPopoverAlign = (): "start" | "center" | "end" => {
    switch (toolbarPosition) {
      case "left":
      case "right":
        return "start";
      default:
        return "center";
    }
  };

  // Get popover side based on toolbar position
  const getPopoverSide = (): "top" | "right" | "bottom" | "left" => {
    switch (toolbarPosition) {
      case "top":
        return "bottom";
      case "bottom":
        return "top";
      case "left":
        return "right";
      case "right":
        return "left";
    }
  };

  const handleToolbarPositionChange = (nextPosition: ToolbarPosition) => {
    flushSync(() => setIsToolbarPositionPopoverOpen(false));
    setToolbarPosition(nextPosition);
  };

  const handleToolbarScroll = () => {
    if (!scrollContainerRef.current) return;

    if (isToolbarVertical) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setIsAtStart(scrollTop <= 0);
      setIsAtEnd(Math.ceil(scrollTop + clientHeight) >= scrollHeight - 1);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setIsAtStart(scrollLeft <= 0);
    setIsAtEnd(Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 1);
  };

  const toolbarMotion = {
    top: {
      initial: { y: -72, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: -72, opacity: 0 },
    },
    bottom: {
      initial: { y: 72, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: 72, opacity: 0 },
    },
    left: {
      initial: { x: -72, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -72, opacity: 0 },
    },
    right: {
      initial: { x: 72, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: 72, opacity: 0 },
    },
  } as const;

  const toolbarShellClassName = {
    top: "fixed left-0 top-0 w-full border-b",
    bottom: "fixed bottom-0 left-0 w-full border-t",
    left: "fixed left-0 top-0 h-screen w-[50px] border-r",
    right: "fixed right-0 top-0 h-screen w-[50px] border-l",
  } satisfies Record<ToolbarPosition, string>;

  const toolbarDirectionOptions: Array<{
    label: string;
    value: ToolbarPosition;
    Icon: typeof ArrowUp;
  }> = [
    { label: "Top", value: "top", Icon: ArrowUp },
    { label: "Left", value: "left", Icon: ArrowLeft },
    { label: "Right", value: "right", Icon: ArrowRight },
    { label: "Bottom", value: "bottom", Icon: ArrowDown },
  ];

  const ActiveToolbarPositionIcon =
    toolbarDirectionOptions.find((option) => option.value === toolbarPosition)?.Icon ?? ArrowUp;

  return (
    <div
      ref={editorRef}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const isToolbarClick = target.closest("[data-toolbar]");
        const isInteractiveClick = target.closest(
          "input, button, select, textarea, a, [role='dialog'], [data-radix-popper-content-wrapper]"
        );

        // CRITICAL: If meta editing is active or it's a toolbar/ui click, block focus
        if (isMetaEditing || isToolbarClick || isInteractiveClick) {
          return;
        }

        editor.commands.focus();
      }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        const isToolbar = target.closest("[data-toolbar]");

        if (isToolbar) {
          // If we are editing title/subtitle, prevent the toolbar click
          // from stealing focus, which keeps the editor "blurred" and buttons disabled.
          if (isMetaEditing) {
            e.preventDefault();
          }
        }
      }}
      className={cn(
        "group w-full bg-transparent border-none shadow-none p-0",
        hasError && "outline outline-1 outline-[#F9B9BA] dark:outline-[#822125]"
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={toolbarPosition}
          data-toolbar
          initial={toolbarMotion[toolbarPosition].initial}
          animate={toolbarMotion[toolbarPosition].animate}
          exit={toolbarMotion[toolbarPosition].exit}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            "z-50 bg-white dark:bg-black border-[#EAEAEA] dark:border-[#1E1E1E]",
            toolbarShellClassName[toolbarPosition],
            isMetaEditing && "pointer-events-none cursor-not-allowed"
          )}
        >
          <div
            className={cn(
              "absolute pointer-events-none z-50 transition-opacity duration-500",
              isToolbarVertical
                ? "inset-x-0 top-0 h-12 bg-gradient-to-b from-white dark:from-black to-transparent"
                : "inset-y-0 left-0 w-12 bg-gradient-to-r from-white dark:from-black to-transparent xl:-inset-y-[1px] xl:opacity-100",
              isAtStart ? "opacity-0" : "opacity-100"
            )}
          />

          <div
            className={cn(
              "absolute pointer-events-none z-50 transition-opacity duration-500",
              isToolbarVertical
                ? "inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white dark:from-black to-transparent"
                : "inset-y-0 right-0 w-12 bg-gradient-to-l from-white dark:from-black to-transparent xl:-inset-y-[1px] xl:opacity-100",
              isAtEnd ? "opacity-0" : "opacity-100"
            )}
          />

          <div
            ref={scrollContainerRef}
            onScroll={handleToolbarScroll}
            className={cn(
              "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
              isToolbarVertical
                ? "flex h-full items-center mx-auto overflow-y-auto overflow-x-hidden"
                : "w-full overflow-x-auto overflow-y-hidden"
            )}
          >
            <div
              className={cn(
                "relative flex gap-2",
                isToolbarVertical
                  ? "my-auto h-max flex-col items-center justify-center px-2 py-3"
                  : "mx-auto w-max items-center px-3 py-2"
              )}
            >
              <Button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run() || disableInlineFormatting}
                variant="outline"
                size="sm"
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run() || disableInlineFormatting}
                variant="outline"
                size="sm"
                title="Redo"
              >
                <Redo className="h-4 w-4" />
              </Button>

              <div
                className={cn(
                  "bg-[#EAEAEA] dark:bg-[#1E1E1E]",
                  isToolbarVertical ? "h-px w-8" : "h-8 w-px"
                )}
              />

              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                disabled={disableBlockFormatting}
                variant={editor.isActive("heading", { level: 1 }) ? "default" : "outline"}
                size="sm"
                title="Heading 1"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                disabled={disableBlockFormatting}
                variant={editor.isActive("heading", { level: 2 }) ? "default" : "outline"}
                size="sm"
                title="Heading 2"
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => editor.chain().focus().setParagraph().run()}
                disabled={disableBlockFormatting}
                variant={editor.isActive("paragraph") ? "default" : "outline"}
                size="sm"
                title="Paragraph"
              >
                <Pilcrow className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleCaption().run()}
                disabled={disableBlockFormatting}
                variant={editor.isActive("caption") ? "default" : "outline"}
                size="sm"
                title="Caption"
              >
                <MessageSquareQuote className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleCallout().run()}
                disabled={disableBlockFormatting}
                variant={editor.isActive("callout") ? "default" : "outline"}
                size="sm"
                title="Callout"
              >
                <StickyNote className="h-4 w-4" />
              </Button>

              <div
                className={cn(
                  "bg-[#EAEAEA] dark:bg-[#1E1E1E]",
                  isToolbarVertical ? "h-px w-8" : "h-8 w-px"
                )}
              />

              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={disableInlineFormatting}
                variant={editorState?.isBold ? "default" : "outline"}
                size="sm"
                title="Bold (⌘B)"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={disableInlineFormatting}
                variant={editorState?.isItalic ? "default" : "outline"}
                size="sm"
                title="Italic (⌘I)"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={handleToggleLink}
                disabled={disableInlineFormatting}
                variant={editor.isActive("link") ? "default" : "outline"}
                size="sm"
                title="Link"
              >
                <Link2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleBadge().run()}
                disabled={disableInlineFormatting}
                variant={editorState?.isBadge ? "default" : "outline"}
                size="sm"
                title="Tag"
              >
                <Tag className="h-4 w-4" />
              </Button>

              <div
                className={cn(
                  "bg-[#EAEAEA] dark:bg-[#1E1E1E]",
                  isToolbarVertical ? "h-px w-8" : "h-8 w-px"
                )}
              />

              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                variant={editor.isActive("bulletList") ? "default" : "outline"}
                disabled={disableBlockFormatting}
                size="sm"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                variant={editor.isActive("orderedList") ? "default" : "outline"}
                disabled={disableBlockFormatting}
                size="sm"
                title="Ordered List"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>

              <div
                className={cn(
                  "bg-[#EAEAEA] dark:bg-[#1E1E1E]",
                  isToolbarVertical ? "h-px w-8" : "h-8 w-px"
                )}
              />

              <Button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                disabled={disableBlockFormatting}
                variant={editor.isActive({ textAlign: "left" }) ? "default" : "outline"}
                size="sm"
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                disabled={disableBlockFormatting}
                variant={editor.isActive({ textAlign: "center" }) ? "default" : "outline"}
                size="sm"
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                disabled={disableBlockFormatting}
                variant={editor.isActive({ textAlign: "right" }) ? "default" : "outline"}
                size="sm"
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                disabled={disableBlockFormatting}
                variant={editor.isActive({ textAlign: "justify" }) ? "default" : "outline"}
                size="sm"
                title="Align Justify"
              >
                <AlignJustify className="h-4 w-4" />
              </Button>

              <div
                className={cn(
                  "bg-[#EAEAEA] dark:bg-[#1E1E1E]",
                  isToolbarVertical ? "h-px w-8" : "h-8 w-px"
                )}
              />

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    disabled={disableBlockFormatting}
                    variant={editor.isActive("fileCodeBlock") ? "default" : "outline"}
                    size="sm"
                    title="Code Block"
                  >
                    <Code2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align={getPopoverAlign()} side={getPopoverSide()} className="p-3">
                  <div className="z-50 p-3 bg-[#F6F6F6] dark:bg-[#060606] border border-[#EAEAEA] dark:border-[#1E1E1E] rounded-lg shadow-xl flex flex-col gap-3">
                    <span className="text-xs font-bold text-black dark:text-white">Code Block</span>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={codeBlockShowHeader}
                        onCheckedChange={(v) => setCodeBlockShowHeader(v === true)}
                        className="cursor-pointer"
                      />
                      Show header
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .insertContent({
                            type: "fileCodeBlock",
                            attrs: { showHeader: codeBlockShowHeader },
                          })
                          .run();
                      }}
                    >
                      Insert Code Block
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    disabled={disableBlockFormatting}
                    variant={editor.isActive("terminalBlock") ? "default" : "outline"}
                    size="sm"
                    title="Terminal Block"
                  >
                    <Terminal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align={getPopoverAlign()} side={getPopoverSide()} className="p-3">
                  <div className="z-50 p-3 bg-[#F6F6F6] dark:bg-[#060606] border border-[#EAEAEA] dark:border-[#1E1E1E] rounded-lg shadow-xl flex flex-col gap-3">
                    <span className="text-xs font-bold text-black dark:text-white">
                      Terminal Block
                    </span>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={terminalShowHeader}
                        onCheckedChange={(v) => setTerminalShowHeader(v === true)}
                        className="cursor-pointer"
                      />
                      Show header
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .insertContent({
                            type: "terminalBlock",
                            attrs: { showHeader: terminalShowHeader },
                          })
                          .run();
                      }}
                    >
                      Insert Terminal Block
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      disabled={disableBlockFormatting}
                      variant={isInTable || editor.isActive("table") ? "default" : "outline"}
                      size="sm"
                      title="Custom Table"
                    >
                      <TableIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align={getPopoverAlign()} side={getPopoverSide()} className="p-3">
                    <div className="z-50 p-3 bg-[#F6F6F6] dark:bg-[#060606] border border-[#EAEAEA] dark:border-[#1E1E1E] rounded-lg shadow-xl w-54 flex flex-col gap-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-black dark:text-white">
                          Create Table
                        </span>
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
                            min="2"
                            max="20"
                            value={tableRows}
                            onChange={handleRowChange}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                setSafeTableRows(e.currentTarget.value);
                              }
                            }}
                            className="w-full text-sm p-1.5 border border-[#EAEAEA] dark:border-[#1E1E1E] rounded bg-white dark:bg-black focus-within:ring-3 focus-within:ring-[#ffc7bb] dark:focus-within:ring-[#660900] focus-visible:border-primary dark:focus-visible:border-primary focus-within:outline-none no-spinner"
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
                                setSafeTableCols(e.currentTarget.value);
                              }
                            }}
                            className="w-full text-sm p-1.5 border border-[#EAEAEA] dark:border-[#1E1E1E] rounded bg-white dark:bg-black focus-within:ring-3 focus-within:ring-[#ffc7bb] dark:focus-within:ring-[#660900] focus-visible:border-primary dark:focus-visible:border-primary focus-within:outline-none no-spinner"
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

              <div
                className={cn(
                  "bg-[#EAEAEA] dark:bg-[#1E1E1E]",
                  isToolbarVertical ? "h-px w-8" : "h-8 w-px"
                )}
              />

              <Popover
                open={isToolbarPositionPopoverOpen}
                onOpenChange={setIsToolbarPositionPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" title="Toolbar position">
                    <ActiveToolbarPositionIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align={getPopoverAlign()} side={getPopoverSide()} className="p-3">
                  <div className="z-50 p-3 w-full bg-[#F6F6F6] dark:bg-[#060606] border border-[#EAEAEA] dark:border-[#1E1E1E] rounded-lg shadow-xl flex flex-col gap-3">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {toolbarDirectionOptions.map(({ label, value, Icon }) => (
                        <Button
                          key={value}
                          type="button"
                          variant={toolbarPosition === value ? "default" : "secondary"}
                          className="w-full"
                          onClick={() => handleToolbarPositionChange(value)}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Character Counter */}
              <div
                className={cn(
                  "flex items-center text-xs",
                  isToolbarVertical ? "w-full justify-center" : "w-16 justify-between"
                )}
              >
                <span
                  className={`text-xs tabular-nums transition-colors ${counterColor(bodyValue.length, MAX_CHARS)}`}
                >
                  {formatCount(bodyValue.length)} / {formatCount(MAX_CHARS)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <EditorContent
        editor={editor}
        id={id}
        name={name}
        role="textbox"
        aria-multiline="true"
        aria-labelledby="content-label"
        aria-label="content editor"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("input, button, select, textarea")) return;
          editor.commands.focus();
        }}
        className="
          w-full bg-transparent border-none shadow-none p-0 h-auto overflow-visible cursor-text text-paragraph focus:outline-none

          [&_.ProseMirror]:min-h-[200px]
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror]:px-0
          [&_.ProseMirror]:pt-2
          [&_.ProseMirror]:pb-32

          [&_.ProseMirror_strong]:font-bold [&_.ProseMirror_strong]:text-paragraph
          [&_.ProseMirror_b]:font-bold [&_.ProseMirror_b]:text-paragraph
          [&_.ProseMirror_em]:italic [&_.ProseMirror_i]:italic

          [&_.ProseMirror_p]:my-6 [&_.ProseMirror_p]:leading-6.5
          [&_.ProseMirror_li]:leading-6.5
          [&_.ProseMirror_blockquote]:leading-6.5
          [&_.ProseMirror_.react-renderer]:my-12
          [&_.ProseMirror_.react-renderer:has(+figcaption)]:mb-0
          [&_.ProseMirror_table]:my-12
          [&_.ProseMirror_table:has(+figcaption)]:mb-0

          [&_.ProseMirror_ul]:flex
          [&_.ProseMirror_ul]:list-disc
          [&_.ProseMirror_ul]:flex-col
          [&_.ProseMirror_ul]:gap-2
          [&_.ProseMirror_ul]:pl-4
          [&_.ProseMirror_ol]:flex
          [&_.ProseMirror_ol]:list-decimal
          [&_.ProseMirror_ol]:flex-col
          [&_.ProseMirror_ol]:gap-2
          [&_.ProseMirror_ol]:pl-4

          [&_.ProseMirror_h1]:mt-24
          [&_.ProseMirror_h1]:mb-6
          [&_.ProseMirror_h1]:text-3xl
          [&_.ProseMirror_h1]:font-black
          [&_.ProseMirror_h1]:leading-tight
          [&_.ProseMirror_h1]:text-black
          dark:[&_.ProseMirror_h1]:text-white

          [&_.ProseMirror_h2]:mt-14
          [&_.ProseMirror_h2]:mb-3
          [&_.ProseMirror_h2]:text-2xl
          [&_.ProseMirror_h2]:font-bold
          [&_.ProseMirror_h2]:text-black
          dark:[&_.ProseMirror_h2]:text-white

          [&_.ProseMirror_code]:rounded
          [&_.ProseMirror_code]:bg-muted
          [&_.ProseMirror_code]:px-1
          [&_.ProseMirror_code]:py-0.5
          [&_.ProseMirror_code]:text-sm
          [&_.ProseMirror_pre_code]:bg-transparent
          [&_.ProseMirror_pre_code]:p-0

          [&_.ProseMirror_blockquote]:my-6
          [&_.ProseMirror_blockquote]:border-l-4
          [&_.ProseMirror_blockquote]:border-[#EAEAEA]
          [&_.ProseMirror_blockquote]:pl-4
          [&_.ProseMirror_blockquote]:italic
          dark:[&_.ProseMirror_blockquote]:border-[#1E1E1E]

          [&_.ProseMirror_hr]:my-8
          [&_.ProseMirror_hr]:border-t-2
          [&_.ProseMirror_hr]:border-[#EAEAEA]
          dark:[&_.ProseMirror_hr]:border-[#1E1E1E]

          [&_.ProseMirror_a]:text-primary
          [&_.ProseMirror_a:hover]:underline
          hover:[&_.ProseMirror_a]:cursor-pointer

          [&_table]:relative
          [&_table]:my-12
          [&_table]:flex
          [&_table]:w-full
          [&_table]:table-fixed
          [&_table]:justify-center-safe
          [&_table]:overflow-x-auto
          [&_table]:overflow-y-hidden
          [&_table]:border-separate
          [&_table]:border-spacing-0
          [&_table]:rounded-xl
          [&_table]:px-4
          [&_table]:[scrollbar-width:none]
          [&_table]:[-ms-overflow-style:none]
          [&_table]:[&::-webkit-scrollbar]:hidden
          [&_table]:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_3%,black_97%,transparent_100%)]
          [&_table]:[mask-image:linear-gradient(to_right,transparent_0%,black_3%,black_97%,transparent_100%)]
          [&_colgroup]:hidden
          [&_col]:hidden
          [&_td]:min-w-[150px]
          [&_td]:h-20
          [&_th]:min-w-[150px]
          [&_th]:h-20

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
          [&_.ProseMirror_th]:pl-4
          [&_.ProseMirror_th]:text-left
          [&_.ProseMirror_th]:font-bold
          [&_.ProseMirror_th]:align-middle
          dark:[&_.ProseMirror_th]:bg-black
          [&_.ProseMirror_td]:bg-white
          [&_.ProseMirror_td]:pl-4
          [&_.ProseMirror_td]:text-left
          [&_.ProseMirror_td]:align-middle
          dark:[&_.ProseMirror_td]:bg-[#0A0A0A]
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
