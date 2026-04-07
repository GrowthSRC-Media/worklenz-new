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

  const initialValue = useRef(value || '');
  const editor = useEditor({
    extensions: buildExtensions(placeholder),
    content: '',
    editable,
    autofocus: autoFocus ? 'end' : false,
    onCreate: ({ editor }) => {
      // tiptap-markdown only intercepts setContent, so we must seed via the
      // command (not the `content` option) for markdown to be parsed.
      if (initialValue.current) {
        editor.commands.setContent(initialValue.current, false);
        lastEmitted.current = initialValue.current;
      }
    },
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

  // Editor is uncontrolled after init: re-parsing markdown mid-edit collapses
  // in-progress structures (empty list items, paragraph breaks). Parents that
  // need to swap content (e.g. switching tasks) should pass a different React
  // `key` to remount this component instead.

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
      onCreate: ({ editor }) => {
        if (value) editor.commands.setContent(value, false);
      },
    },
    [value]
  );

  return (
    <div className={`tiptap-md-view theme-${themeMode} ${className || ''}`}>
      <EditorContent editor={editor} />
    </div>
  );
};
