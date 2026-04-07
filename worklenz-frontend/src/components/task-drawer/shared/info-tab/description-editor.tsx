import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useSocket } from '@/socket/socketContext';
import { SocketEvents } from '@/shared/socket-events';
import TiptapMarkdownEditor, {
  MarkdownView,
} from '@/components/editors/tiptap-markdown-editor/tiptap-markdown-editor';
import { isLikelyHtml } from '@/utils/markdown';

interface DescriptionEditorProps {
  description: string | null;
  taskId: string;
  parentTaskId: string | null;
}

const DescriptionEditor = ({ description, taskId, parentTaskId }: DescriptionEditorProps) => {
  const { socket } = useSocket();
  const themeMode = useAppSelector(state => state.themeReducer.mode);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [content, setContent] = useState<string>(description || '');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContent(description || '');
  }, [description, taskId]);

  const persistDescription = (next: string) => {
    if (!taskId) return;
    socket?.emit(
      SocketEvents.TASK_DESCRIPTION_CHANGE.toString(),
      JSON.stringify({
        task_id: taskId,
        description: next || null,
        parent_task: parentTaskId,
      })
    );
  };

  // Click-outside to close + persist
  useEffect(() => {
    if (!isEditorOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const wrapper = wrapperRef.current;
      const target = event.target as Node;
      if (wrapper && !wrapper.contains(target)) {
        if (content !== (description || '')) {
          persistDescription(content);
        }
        setIsEditorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditorOpen, content, description]);

  const renderReadOnly = () => {
    if (!content) {
      return (
        <div
          style={{
            color: themeMode === 'dark' ? '#888888' : '#999999',
            fontStyle: 'italic',
          }}
        >
          Click to add description...
        </div>
      );
    }
    if (isLikelyHtml(content)) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          className="description-content"
        />
      );
    }
    return <MarkdownView value={content} className="description-content" />;
  };

  return (
    <div ref={wrapperRef}>
      {isEditorOpen ? (
        <TiptapMarkdownEditor
          key={taskId}
          value={content}
          onChange={setContent}
          onBlur={next => {
            if (next !== (description || '')) persistDescription(next);
          }}
          autoFocus
          minHeight={200}
          placeholder="Add a description (markdown supported)..."
        />
      ) : (
        <div
          onClick={() => setIsEditorOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            minHeight: '40px',
            padding: '8px 12px',
            border: `1px solid ${themeMode === 'dark' ? '#424242' : '#d9d9d9'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: isHovered
              ? themeMode === 'dark'
                ? '#2a2a2a'
                : '#fafafa'
              : themeMode === 'dark'
              ? '#1e1e1e'
              : '#ffffff',
            color: themeMode === 'dark' ? '#ffffff' : '#000000',
            transition: 'all 0.2s ease',
          }}
        >
          {renderReadOnly()}
        </div>
      )}
    </div>
  );
};

export default DescriptionEditor;
