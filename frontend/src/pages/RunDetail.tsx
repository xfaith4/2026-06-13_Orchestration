import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { Run, ExecutionTask } from '../types';

export function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRun = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<Run>(`/runs/${id}`);
        setRun(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load run');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRun();
    }
  }, [id]);

  const handleStartRun = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const updated = await apiClient.put<Run>(`/runs/${id}/start`, {});
      setRun(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start run');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseRun = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const updated = await apiClient.put<Run>(`/runs/${id}/pause`, {});
      setRun(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to pause run');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartTask = async (phaseId: string, taskId: string) => {
    if (!id) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const updated = await apiClient.put<Run>(
        `/runs/${id}/phase/${phaseId}/task/${taskId}/start`,
        {}
      );
      setRun(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTask = async (phaseId: string, taskId: string) => {
    if (!id) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const updated = await apiClient.put<Run>(
        `/runs/${id}/phase/${phaseId}/task/${taskId}/complete`,
        {}
      );
      setRun(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFailTask = async (phaseId: string, taskId: string) => {
    if (!id) return;
    const errorMsg = prompt('Enter error message:');
    if (!errorMsg) return;

    try {
      setActionLoading(true);
      setActionError(null);
      const updated = await apiClient.put<Run>(
        `/runs/${id}/phase/${phaseId}/task/${taskId}/fail`,
        { error: errorMsg }
      );
      setRun(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to fail task');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-purple-100 text-purple-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'blocked':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskActions = (task: ExecutionTask) => {
    switch (task.status) {
      case 'pending':
      case 'assigned':
        return ['start'];
      case 'in-progress':
        return ['complete', 'fail'];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading run...</div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <button
            onClick={() => navigate('/runs')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Runs
          </button>
        </div>
        <div className="text-red-600">{error || 'Run not found'}</div>
      </div>
    );
  }

  const totalTasks = run.phases.flatMap(p => p.tasks).length;
  const completedTasks = run.phases.flatMap(p => p.tasks).filter(t => t.status === 'completed').length;

  return (
    <div className="p-6">
      <div className="mb-4">
        <button
          onClick={() => navigate('/runs')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Runs
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{run.title}</h1>
            <p className="text-sm text-gray-600 mt-2">{run.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            run.status === 'draft' ? 'bg-gray-100 text-gray-800' :
            run.status === 'pending' ? 'bg-blue-100 text-blue-800' :
            run.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
            run.status === 'completed' ? 'bg-green-100 text-green-800' :
            run.status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold text-gray-600">ROADMAP ID</span>
            <code className="block bg-gray-100 px-2 py-1 rounded text-sm mt-1">{run.roadmapId}</code>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-600">PHASES</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">{run.phases.length}</div>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-600">TASKS</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">{completedTasks}/{totalTasks}</div>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-600">CREATED</span>
            <div className="text-sm text-gray-900 mt-1">{new Date(run.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        {actionError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{actionError}</p>
          </div>
        )}

        <div className="mb-6 space-y-3">
          {run.status === 'draft' && (
            <button
              onClick={handleStartRun}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Starting...' : 'Start Run'}
            </button>
          )}

          {run.status === 'running' && (
            <button
              onClick={handlePauseRun}
              disabled={actionLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Pausing...' : 'Pause Run'}
            </button>
          )}

          {run.errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800">Run Failed</p>
              <p className="text-sm text-red-700 mt-1">{run.errorMessage}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {run.phases.map((phase) => (
            <div key={phase.id} className="border-l-4 border-blue-500 pl-4 py-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Phase {phase.number}: {phase.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{phase.goal}</p>
                </div>
                <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(phase.status)}`}>
                  {phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}
                </span>
              </div>

              <div className="space-y-2 mt-3">
                {phase.tasks.map((task) => {
                  const actions = getTaskActions(task);

                  return (
                    <div key={task.id} className="bg-gray-50 rounded p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{task.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          {task.estimatedHours && (
                            <p className="text-xs text-gray-600 mt-2">
                              <span className="font-semibold">{task.estimatedHours}h</span>
                            </p>
                          )}
                          {task.error && (
                            <p className="text-xs text-red-600 mt-2">
                              <span className="font-semibold">Error:</span> {task.error}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex flex-col gap-2 items-end">
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(task.status)}`}>
                            {task.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                          {actions.length > 0 && (
                            <div className="flex gap-1">
                              {actions.includes('start') && (
                                <button
                                  onClick={() => handleStartTask(phase.id, task.id)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Start
                                </button>
                              )}
                              {actions.includes('complete') && (
                                <button
                                  onClick={() => handleCompleteTask(phase.id, task.id)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Done
                                </button>
                              )}
                              {actions.includes('fail') && (
                                <button
                                  onClick={() => handleFailTask(phase.id, task.id)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Fail
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
