import { Typography } from '@/shared/antd-imports';
import { markdownToPlainText } from '@/utils/markdown';

const TaskListDescriptionCell = ({ description }: { description: string }) => {
  const preview = markdownToPlainText(description);

  return (
    <Typography.Paragraph
      ellipsis={{
        expandable: false,
        rows: 1,
        tooltip: preview,
      }}
      style={{ width: 260, marginBlockEnd: 0 }}
    >
      {preview}
    </Typography.Paragraph>
  );
};

export default TaskListDescriptionCell;
