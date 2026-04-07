import React, { useEffect, useRef, useState } from 'react';
import { Input, Typography } from '@/shared/antd-imports';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useSocket } from '@/socket/socketContext';
import { SocketEvents } from '@/shared/socket-events';
import { markdownToPlainText, renderMarkdown } from '@/utils/markdown';

interface DescriptionEditorProps {
  description: string | null;
  taskId: string;
  parentTaskId: string | null;
}

const DescriptionEditor = ({ description, taskId, parentTaskId }: DescriptionEditorProps) => {
  const { socket } = useSocket();
  const themeMode = useAppSelector(state => state.themeReducer.mode);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(description || '');
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<any>(null);

  useEffect(() => {
    setContent(description || '');
  }, [description]);

  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        saveDescription();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, content, description]);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
    }
  }, [isEditing]);

  const saveDescription = () => {
    if (!taskId) return;

    const nextValue = content.trim();
    const previousValue = (description || '').trim();

    if (nextValue === previousValue) {
      setIsEditing(false);
      return;
    }

    socket?.emit(
      SocketEvents.TASK_DESCRIPTION_CHANGE.toString(),
      JSON.stringify({
        task_id: taskId,
        description: nextValue || null,
        parent_task: parentTaskId,
      })
    );

    setIsEditing(false);
  };

  const renderedDescription = renderMarkdown(content);
  const previewText = markdownToPlainText(content);

  return (
    <div ref={wrapperRef}>
      {isEditing ? (
        <div>
          <Input.TextArea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            autoSize={{ minRows: 8, maxRows: 18 }}
            onPressEnter={e => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                saveDescription();
              }
            }}
            style={{
              backgroundColor: themeMode === 'dark' ? '#1e1e1e' : '#ffffff',
              color: themeMode === 'dark' ? '#ffffff' : '#000000',
              borderColor: themeMode === 'dark' ? '#424242' : '#d9d9d9',
              marginBottom: 8,
            }}
            placeholder="Write a task description using Markdown..."
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Markdown supported. Press Ctrl+Enter to save.
          </Typography.Text>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
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
          {content ? (
            <div
              className="description-content markdown-content"
              title={previewText}
              dangerouslySetInnerHTML={{ __html: renderedDescription }}
            />
          ) : (
            <div
              style={{
                color: themeMode === 'dark' ? '#888888' : '#999999',
                fontStyle: 'italic',
              }}
            >
              Click to add description using Markdown...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DescriptionEditor;
