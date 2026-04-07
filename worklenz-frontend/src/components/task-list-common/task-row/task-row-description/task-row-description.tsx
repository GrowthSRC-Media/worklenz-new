import { markdownToPlainText } from '@/utils/markdown';

const TaskRowDescription = ({ description }: { description: string }) => {
  const preview = markdownToPlainText(description);

  return (
    <div
      style={{
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'block',
        maxHeight: '24px', // Enforce single line height
        lineHeight: '24px',
      }}
      title={preview}
    >
      {preview}
    </div>
  );
};

export default TaskRowDescription;
