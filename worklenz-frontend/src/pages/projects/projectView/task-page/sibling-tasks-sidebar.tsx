import { useMemo } from 'react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { selectAllTasksArray } from '@/features/task-management/task-management.slice';
import { selectCurrentGrouping } from '@/features/task-management/grouping.slice';
import './task-page.css';

interface SiblingTasksSidebarProps {
  currentTaskId: string;
  projectId: string;
  onSelect: (taskId: string) => void;
}

/**
 * ClickUp-style left rail showing tasks that share the current task's group
 * (status / priority / phase) under the project's active grouping.
 *
 * Falls back to "all tasks" if grouping state is empty (e.g. user landed on
 * the page directly without visiting the board first).
 */
const SiblingTasksSidebar = ({ currentTaskId, projectId, onSelect }: SiblingTasksSidebarProps) => {
  const themeMode = useAppSelector(state => state.themeReducer.mode);
  const allTasks = useAppSelector(selectAllTasksArray);
  const currentGrouping = useAppSelector(selectCurrentGrouping);

  const siblings = useMemo(() => {
    if (!allTasks?.length) return [];
    const current = allTasks.find(t => t.id === currentTaskId);
    if (!current || !currentGrouping) return allTasks;

    const key = (t: any) => {
      if (currentGrouping === 'status') return t.status;
      if (currentGrouping === 'priority') return t.priority;
      if (currentGrouping === 'phase') return (!t.phase || !String(t.phase).trim()) ? 'Unmapped' : t.phase;
      return undefined;
    };
    const currentKey = key(current);
    return allTasks.filter(t => key(t) === currentKey);
  }, [allTasks, currentTaskId, currentGrouping]);

  return (
    <aside className={`task-page-sidebar theme-${themeMode}`}>
      <div className="task-page-sidebar-header">
        Tasks {currentGrouping ? `(${currentGrouping})` : ''}
      </div>
      <ul className="task-page-sidebar-list">
        {siblings.length === 0 && (
          <li className="task-page-sidebar-empty">No tasks loaded — open from the board to populate this list.</li>
        )}
        {siblings.map(task => (
          <li
            key={task.id}
            className={`task-page-sidebar-item ${task.id === currentTaskId ? 'active' : ''}`}
            onClick={() => task.id !== currentTaskId && onSelect(task.id)}
          >
            <span className="task-page-sidebar-dot" />
            <span className="task-page-sidebar-name">{(task as any).title || (task as any).name || task.id}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default SiblingTasksSidebar;
