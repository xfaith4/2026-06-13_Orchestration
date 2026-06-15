import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { Run } from '../types';

export function RunList() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<Run[]>('/runs');
        setRuns(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load runs');
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'running':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRunProgress = (run: Run) => {
    const allTasks = run.phases.flatMap(p => p.tasks);
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const total = allTasks.length;
    return { completed, total };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading runs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Execution Runs</h1>
        <button
          onClick={() => navigate('/roadmaps')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Roadmaps
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Runs Yet</h3>
          <p className="text-gray-600 mb-4">
            Create a run from an approved roadmap to start tracking execution.
          </p>
          <button
            onClick={() => navigate('/roadmaps')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Roadmaps
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {runs.map((run) => {
            const progress = getRunProgress(run);
            const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

            return (
              <div
                key={run.id}
                onClick={() => navigate(`/runs/${run.id}`)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{run.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Roadmap: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{run.roadmapId}</code>
                    </p>
                    <p className="text-gray-700 mt-3 line-clamp-2">{run.description}</p>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Progress</span>
                        <span className="text-sm text-gray-600">
                          {progress.completed} of {progress.total} tasks
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(run.status)}`}>
                        {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                      </span>
                      <span className="text-xs text-gray-600 py-1">
                        {new Date(run.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-blue-600">{run.phases.length}</div>
                    <p className="text-xs text-gray-600">Phases</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
