"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
  Unlink,
} from "lucide-react";
import { cn } from "@/libs/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors",
        active && "bg-gray-200 dark:bg-gray-600",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />;
}

function setLink(editor: Editor) {
  const previous = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("링크 주소를 입력하세요", previous ?? "https://");
  if (url === null) return;
  if (url.trim() === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

function Toolbar({ editor }: { editor: Editor }) {
  // 선택 영역이 바뀔 때만 툴바의 활성 표시를 다시 그린다.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      link: e.isActive("link"),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 dark:border-gray-700 p-1.5">
      <ToolbarButton
        label="굵게"
        active={state.bold}
        onClick={() => chain().toggleBold().run()}
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="기울임"
        active={state.italic}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="밑줄"
        active={state.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <UnderlineIcon size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="취소선"
        active={state.strike}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="제목 1"
        active={state.h1}
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="제목 2"
        active={state.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="제목 3"
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={16} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="글머리 목록"
        active={state.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="번호 목록"
        active={state.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="인용"
        active={state.blockquote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="구분선"
        onClick={() => chain().setHorizontalRule().run()}
      >
        <Minus size={16} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="링크"
        active={state.link}
        onClick={() => setLink(editor)}
      >
        <LinkIcon size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="링크 해제"
        disabled={!state.link}
        onClick={() => chain().extendMarkRange("link").unsetLink().run()}
      >
        <Unlink size={16} />
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 코드 관련 노드는 툴바에서 다루지 않는다. 링크는 클릭 이동 대신 편집만 허용.
        code: false,
        codeBlock: false,
        link: { openOnClick: false },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    // SSR 시 하이드레이션 불일치를 피하기 위해 클라이언트에서만 렌더링한다.
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
    editorProps: {
      attributes: {
        class:
          "rich-editor-content min-h-[240px] px-4 py-3 text-sm text-gray-900 dark:text-gray-100 outline-none",
      },
    },
  });

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
