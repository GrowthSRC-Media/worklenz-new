import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/hooks/useAppSelector';
import './tiptap-markdown-editor.css';

interface TiptapMarkdownEditorProps {
  value: string;
  onChange?: (markdown: string) => void;
  onBlur?: (markdown: string) => void;
  editable?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  minHeight?: number;
  maxLength?: number;
  className?: string;
}

const buildExtensions = (placeholder?: string) => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Link.configure({
    openOnClick: true,
    autolink: true,
    HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
  }),
  Markdown.configure({
    html: false,
    linkify: true,
    breaks: false,
    tightLists: true,
    bulletListMarker: '-',
    transformPastedText: true,
    transformCopiedText: true,
  }),
  ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
];

const getMd = (editor: Editor): string => {
  // tiptap-markdown adds storage.markdown.getMarkdown()
  return (editor.storage as any).markdown?.getMarkdown?.() ?? '';
};

const TiptapMarkdownEditor = ({
  value,
  onChange,
  onBlur,
  editable = true,
  placeholder,
  autoFocus,
  minHeight = 120,
  maxLength,
  className,
}: TiptapMarkdownEditorProps) => {
  const themeMode = useAppSelector(state => state.themeReducer.mode);
  const lastEmitted = useRef<string>(value || '');

  const editor = useEditor({
    extensions: buildExtensions(placeholder),
    content: '',
    editable,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      const md = getMd(editor);
      if (maxLength && md.length > maxLength) return;
      lastEmitted.current = md;
      onChange?.(md);
    },
    onBlur: ({ editor }) => {
      onBlur?.(getMd(editor));
    },
  });

  // Initial parse: tiptap-markdown only intercepts `setContent`, not the
  // `content` option passed to useEditor — so we must set it explicitly.
  const didInit = useRef(false);
  useEffect(() => {
    if (!editor || didInit.current) return;
    didInit.current = true;
    if (value) {
      editor.commands.setContent(value, false);
      lastEmitted.current = value;
    }
  }, [editor, value]);

  // Sync external value changes (e.g. switching tasks).
  // CRITICAL: never re-sync while the user is actively typing — markdown
  // round-trip isn't byte-identical and re-parsing mid-edit will collapse
  // in-progress structures (empty list items, soft breaks, etc.).
  useEffect(() => {
    if (!editor || !didInit.current) return;
    if (editor.isFocused) return;
    const current = getMd(editor);
    if ((value || '') !== current && (value || '') !== lastEmitted.current) {
      editor.commands.setContent(value || '', false);
      lastEmitted.current = value || '';
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  return (
    <div
      className={`tiptap-md-wrapper theme-${themeMode} ${className || ''}`}
      style={{ minHeight }}
    >
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapMarkdownEditor;

interface MarkdownViewProps {
  value: string;
  className?: string;
}

/**
 * Read-only renderer that uses the same Tiptap pipeline as the editor,
 * so authored content always matches what is shown.
 */
export const MarkdownView = ({ value, className }: MarkdownViewProps) => {
  const themeMode = useAppSelector(state => state.themeReducer.mode);
  const editor = useEditor(
    {
      extensions: buildExtensions(),
      content: '',
      editable: false,
    },
    [value]
  );

  // Parse markdown via the Markdown extension's setContent override.
  useEffect(() => {
    if (editor && value) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  return (
    <div className={`tiptap-md-view theme-${themeMode} ${className || ''}`}>
      <EditorContent editor={editor} />
    </div>
  );
};
