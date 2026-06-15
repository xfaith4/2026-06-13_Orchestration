import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { Roadmap, Run } from '../types';

export function RoadmapDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runCreating, setRunCreating] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<Roadmap>(`/roadmaps/${id}`);
        setRoadmap(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load roadmap');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRoadmap();
    }
  }, [id]);

  const handleCreateRun = async () => {
    if (!id) return;
    try {
      setRunCreating(true);
      setRunError(null);
      const run = await apiClient.post<Run>(
        `/runs/from-roadmap/${id}`,
        {}
      );
      navigate(`/runs/${run.id}`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to create run');
    } finally {
      setRunCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading roadmap...</div>
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <button
            onClick={() => navigate('/roadmaps')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Roadmaps
          </button>
        </div>
        <div className="text-red-600">
          {error || 'Roadmap not found'}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalHours = () => {
    return roadmap.phases.reduce((total, phase) => total + (phase.estimatedHours || 0), 0);
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <button
          onClick={() => navigate('/roadmaps')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Roadmaps
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{roadmap.title}</h1>
          <p className="text-sm text-gray-600 mt-2">{roadmap.description}</p>
          <div className="flex gap-4 mt-4">
            <div>
              <span className="text-xs font-semibold text-gray-600">DESIGN PLAN ID</span>
              <code className="block bg-gray-100 px-2 py-1 rounded text-sm mt-1">{roadmap.designPlanId}</code>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-600">STATUS</span>
              <div className={`px-3 py-1 rounded text-sm font-medium mt-1 inline-block ${
                roadmap.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                roadmap.status === 'approved' ? 'bg-green-100 text-green-800' :
                roadmap.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {roadmap.status.charAt(0).toUpperCase() + roadmap.status.slice(1)}
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-600">DURATION</span>
              <div className="text-sm font-semibold text-gray-900 mt-1">{roadmap.estimatedDuration}</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {roadmap.phases.map((phase, idx) => (
            <div key={phase.id} className="border-l-4 border-blue-500 pl-4 py-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Phase {phase.number}: {phase.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{phase.goal}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{phase.estimatedHours || 0}</div>
                  <p className="text-xs text-gray-600">hours</p>
                </div>
              </div>

              {phase.dependencies.length > 0 && (
                <div className="mb-3 text-sm">
                  <span className="font-semibold text-gray-700">Dependencies:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {phase.dependencies.map((dep, i) => (
                      <span key={i} className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-3">
                {phase.tasks.map((task) => (
                  <div key={task.id} className="bg-gray-50 rounded p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{task.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        {task.estimatedHours && (
                          <p className="text-xs text-gray-600 mt-2">
                            <span className="font-semibold">{task.estimatedHours}h</span>
                          </p>
                        )}
                        {task.dependencies.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {task.dependencies.map((dep) => (
                              <span key={dep} className="bg-gray-300 text-gray-800 px-1 py-0.5 rounded text-xs">
                                {dep}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`ml-4 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(task.status)}`}>
                        {task.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-semibold text-gray-700">Total Estimate</span>
              <div className="text-3xl font-bold text-blue-600 mt-1">{getTotalHours()} hours</div>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-700">Phases</span>
              <div className="text-3xl font-bold text-gray-900 mt-1">{roadmap.phases.length}</div>
            </div>
          </div>
        </div>

        {roadmap.approvedBy && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                ✓ Approved by <span className="font-semibold">{roadmap.approvedBy}</span> on{' '}
                <span className="font-semibold">{new Date(roadmap.approvedAt || '').toLocaleDateString()}</span>
              </p>
              {runError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{runError}</p>
                </div>
              )}
              <button
                onClick={handleCreateRun}
                disabled={runCreating}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runCreating ? 'Creating Run...' : 'Create Execution Run'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
