import { useState, useEffect } from 'react';
import { Button, Form, Input, Space, Typography } from '@/shared/antd-imports';
import { ITaskCommentViewModel } from '@/types/tasks/task-comments.types';
import taskCommentsApiService from '@/api/tasks/task-comments.api.service';
import logger from '@/utils/errorLogger';
import { useAppSelector } from '@/hooks/useAppSelector';
import { themeWiseColor } from '@/utils/themeWiseColor';
import { colors } from '@/styles/colors';

interface TaskViewCommentEditProps {
  commentData: ITaskCommentViewModel;
  onUpdated: (comment: ITaskCommentViewModel) => void;
}

const TaskViewCommentEdit = ({ commentData, onUpdated }: TaskViewCommentEditProps) => {
  const themeMode = useAppSelector(state => state.themeReducer.mode);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  // Initialize content when component mounts
  useEffect(() => {
    setContent(commentData.rawContent || commentData.content || '');
  }, [commentData.rawContent, commentData.content]);

  const handleCancel = () => {
    commentData.edit = false;
    onUpdated(commentData);
  };

  const handleSave = async () => {
    if (!commentData.id || !commentData.task_id) return;

    try {
      setLoading(true);
      const res = await taskCommentsApiService.update(commentData.id, {
        content: content,
        task_id: commentData.task_id,
        comment_id: commentData.id,
        mentions: [],
      });

      if (res.done) {
        commentData.content = content;
        commentData.rawContent = content;
        onUpdated(commentData);

        // Dispatch event to notify that a comment was updated
        document.dispatchEvent(new CustomEvent('task-comment-update', { 
          detail: { taskId: commentData.task_id } 
        }));
      }
    } catch (e) {
      logger.error('Error updating comment', e);
    } finally {
      setLoading(false);
    }
  };

  // Theme-aware styles
  const textAreaStyle = {
    backgroundColor: themeWiseColor('#fff', '#2a2a2a', themeMode),
    color: themeWiseColor('#333', '#d1d0d3', themeMode),
    borderColor: themeWiseColor('#d9d9d9', '#333', themeMode),
  };

  return (
    <div className={`comment-edit-${themeMode}`}>
      <Form layout="vertical">
        <Form.Item>
          <Input.TextArea
            value={content}
            onChange={e => setContent(e.target.value)}
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={textAreaStyle}
            placeholder="Edit comment with Markdown..."
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Markdown supported. Mentions entered while editing are saved as text.
          </Typography.Text>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" loading={loading} onClick={handleSave}>
              Save
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default TaskViewCommentEdit;
