import { useState, useEffect } from 'react';
import { Button, Form, Space } from '@/shared/antd-imports';
import { ITaskCommentViewModel } from '@/types/tasks/task-comments.types';
import taskCommentsApiService from '@/api/tasks/task-comments.api.service';
import logger from '@/utils/errorLogger';
import { useAppSelector } from '@/hooks/useAppSelector';
import TiptapMarkdownEditor from '@/components/editors/tiptap-markdown-editor/tiptap-markdown-editor';
import { extractMentionsFromMarkdown, isLikelyHtml } from '@/utils/markdown';

interface TaskViewCommentEditProps {
  commentData: ITaskCommentViewModel;
  onUpdated: (comment: ITaskCommentViewModel) => void;
}

// Convert legacy HTML comment content to a plain markdown-friendly seed.
const prepareContentForEditing = (content: string): string => {
  if (!content) return '';
  if (!isLikelyHtml(content)) return content;
  return content
    .replace(/<span class="mentions">\s*@(\w+)\s*<\/span>/g, '@$1')
    .replace(/<\/?br\s*\/?>(\n)?/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .trim();
};

const TaskViewCommentEdit = ({ commentData, onUpdated }: TaskViewCommentEditProps) => {
  const themeMode = useAppSelector(state => state.themeReducer.mode);
  const projectMembersList = useAppSelector(state => state.projectMemberReducer.membersList);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    setContent(prepareContentForEditing(commentData.content || ''));
  }, [commentData.content]);

  const handleCancel = () => {
    commentData.edit = false;
    onUpdated(commentData);
  };

  const handleSave = async () => {
    if (!commentData.id || !commentData.task_id) return;

    try {
      setLoading(true);
      const mentions = extractMentionsFromMarkdown(
        content,
        (projectMembersList || []).map(m => ({ id: (m as any).team_member_id, name: m.name }))
      );

      const res = await taskCommentsApiService.update(commentData.id, {
        ...commentData,
        comment_id: commentData.id,
        content,
        mentions,
      } as any);

      if (res.done) {
        commentData.content = content;
        commentData.is_edited = true;
        onUpdated(commentData);

        document.dispatchEvent(
          new CustomEvent('task-comment-update', { detail: { taskId: commentData.task_id } })
        );
      }
    } catch (e) {
      logger.error('Error updating comment', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`comment-edit-${themeMode}`}>
      <Form layout="vertical">
        <Form.Item>
          <TiptapMarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="Edit your comment... (markdown supported, @username to mention)"
            autoFocus
            minHeight={100}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" loading={loading} onClick={handleSave} disabled={!content.trim()}>
              Save
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default TaskViewCommentEdit;
