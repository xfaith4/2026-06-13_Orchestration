import { Run, ExecutionPhase, ExecutionTask } from '../types';

interface ExecutionProgressProps {
  run: Run;
}

export function ExecutionProgress({ run }: ExecutionProgressProps) {
  const getTaskIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '○';
      case 'assigned':
        return '◐';
      case 'in-progress':
        return '◜';
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'blocked':
        return '⊘';
      default:
        return '?';
    }
  };

  const getTaskColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-gray-400';
      case 'assigned':
        return 'text-purple-500';
      case 'in-progress':
        return 'text-yellow-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'blocked':
        return 'text-orange-500';
      default:
        return 'text-gray-400';
    }
  };

  const getPhaseColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (phase: ExecutionPhase) => {
    const total = phase.tasks.length;
    const completed = phase.tasks.filter(t => t.status === 'completed').length;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const allTasks = run.phases.flatMap(p => p.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;
  const failedTasks = allTasks.filter(t => t.status === 'failed').length;
  const inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
          <span className="text-sm text-gray-600">
            {completedTasks}/{totalTasks} tasks completed
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <span className="text-xs font-semibold text-gray-600">COMPLETED</span>
            <div className="text-2xl font-bold text-green-600 mt-1">{completedTasks}</div>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-600">IN PROGRESS</span>
            <div className="text-2xl font-bold text-yellow-600 mt-1">{inProgressTasks}</div>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-600">FAILED</span>
            <div className="text-2xl font-bold text-red-600 mt-1">{failedTasks}</div>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-600">TOTAL</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalTasks}</div>
          </div>
        </div>
      </div>

      {/* Phase Progress */}
      <div className="space-y-4">
        {run.phases.map((phase) => {
          const progress = calculateProgress(phase);
          const phaseCompleted = phase.tasks.filter(t => t.status === 'completed').length;
          const phaseFailed = phase.tasks.filter(t => t.status === 'failed').length;

          return (
            <div key={phase.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Phase {phase.number}: {phase.name}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{phase.goal}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPhaseColor(phase.status)}`}>
                  {phase.status ? phase.status.charAt(0).toUpperCase() + phase.status.slice(1) : 'Pending'}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    phase.status === 'completed'
                      ? 'bg-green-500'
                      : phase.status === 'failed'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-xs text-gray-600 mb-4">
                {phaseCompleted} completed
                {phaseFailed > 0 && `, ${phaseFailed} failed`}
                {' · '}
                {phase.tasks.length} tasks
              </div>

              {/* Task status icons */}
              <div className="flex gap-1 flex-wrap">
                {phase.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="relative group"
                    title={`${task.name} - ${task.status}`}
                  >
                    <span className={`text-xl font-bold ${getTaskColor(task.status)}`}>
                      {getTaskIcon(task.status)}
                    </span>
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                      {task.name}: {task.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
