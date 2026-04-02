import ImprovedTaskFilters from "../task-management/improved-task-filters";
import TaskListV2Section from "./TaskListV2Table";

const TaskListV2: React.FC = () => {

  return (
    <div>
      {/* Task Filters */}
      <div className="flex-none relative z-20" style={{ height: '54px', flexShrink: 0 }}>
        <ImprovedTaskFilters position="list" />
      </div>
      <div className="relative z-0" style={{ isolation: 'isolate' }}>
        <TaskListV2Section />
      </div>
    </div>
  );
};

export default TaskListV2;
