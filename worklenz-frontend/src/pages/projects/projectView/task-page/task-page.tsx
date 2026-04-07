import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Skeleton, Tabs, Flex } from '@/shared/antd-imports';
import { ArrowLeftOutlined } from '@/shared/antd-imports';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import {
  fetchTask,
  setSelectedTaskId,
  setShowTaskDrawer,
} from '@/features/task-drawer/task-drawer.slice';
import { setProjectId } from '@/features/project/project.slice';
import TaskDrawerInfoTab from '@/components/task-drawer/shared/info-tab/task-drawer-info-tab';
import TaskDrawerActivityLog from '@/components/task-drawer/shared/activity-log/task-drawer-activity-log';
import TaskDrawerTimeLog from '@/components/task-drawer/shared/time-log/task-drawer-time-log';
import InfoTabFooter from '@/components/task-drawer/shared/info-tab/info-tab-footer';
import SiblingTasksSidebar from './sibling-tasks-sidebar';
import './task-page.css';

const TaskPage = () => {
  const { t } = useTranslation('task-drawer/task-drawer');
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { taskFormViewModel, loadingTask } = useAppSelector(state => state.taskDrawerReducer);

  // Make sure the drawer is closed while we're using the page view, and the
  // shared task-drawer redux slice is populated for our reused components.
  useEffect(() => {
    if (!projectId || !taskId) return;
    dispatch(setShowTaskDrawer(false));
    dispatch(setProjectId(projectId));
    dispatch(setSelectedTaskId(taskId));
    dispatch(fetchTask({ taskId, projectId }));
  }, [projectId, taskId, dispatch]);

  const tabItems = [
    { key: 'info', label: t('taskInfoTab.title'), children: <TaskDrawerInfoTab t={t} /> },
    { key: 'timeLog', label: t('taskTimeLogTab.title'), children: <TaskDrawerTimeLog t={t} refreshTrigger={0} /> },
    { key: 'activityLog', label: t('taskActivityLogTab.title'), children: <TaskDrawerActivityLog /> },
  ];

  return (
    <div className="task-page">
      <SiblingTasksSidebar
        currentTaskId={taskId || ''}
        projectId={projectId || ''}
        onSelect={otherId => navigate(`/worklenz/projects/${projectId}/tasks/${otherId}`)}
      />
      <div className="task-page-main">
        <Flex align="center" justify="space-between" className="task-page-header">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/worklenz/projects/${projectId}`)}
          >
            Back to project
          </Button>
          <h2 className="task-page-title">
            {taskFormViewModel?.task?.name || (loadingTask ? 'Loading…' : 'Task')}
          </h2>
          <span />
        </Flex>
        <div className="task-page-body">
          <Skeleton active loading={loadingTask && !taskFormViewModel?.task}>
            <Tabs type="card" items={tabItems} destroyOnHidden defaultActiveKey="info" />
          </Skeleton>
        </div>
        <div className="task-page-footer">
          <InfoTabFooter />
        </div>
      </div>
    </div>
  );
};

export default TaskPage;
