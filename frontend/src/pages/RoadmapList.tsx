import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { DesignPlan, Roadmap } from '../types';

export function RoadmapList() {
  const navigate = useNavigate();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [designPlanLabels, setDesignPlanLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [roadmapData, planData] = await Promise.all([
        apiClient.get<Roadmap[]>('/roadmaps'),
        apiClient.get<DesignPlan[]>('/design-plans'),
      ]);
      setRoadmaps(roadmapData || []);
      const labels: Record<string, string> = {};
      for (const plan of planData || []) {
        labels[plan.id] = plan.overview.length > 60
          ? plan.overview.substring(0, 60) + '…'
          : plan.overview;
      }
      setDesignPlanLabels(labels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roadmaps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading roadmaps...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchData}
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
        <h1 className="text-3xl font-bold text-gray-900">Roadmaps</h1>
        <button
          onClick={() => navigate('/design-plans')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Design Plans
        </button>
      </div>

      {roadmaps.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Roadmaps Yet</h3>
          <p className="text-gray-600 mb-4">
            Generate a roadmap from an approved design plan to see it here.
          </p>
          <button
            onClick={() => navigate('/design-plans')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Design Plans
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {roadmaps.map((roadmap) => (
            <div
              key={roadmap.id}
              onClick={() => navigate(`/roadmaps/${roadmap.id}`)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{roadmap.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Design Plan:{' '}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/design-plans/${roadmap.designPlanId}`); }}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {designPlanLabels[roadmap.designPlanId] ?? roadmap.designPlanId}
                    </button>
                  </p>
                  <p className="text-gray-700 mt-3 line-clamp-2">{roadmap.description}</p>
                  <div className="flex gap-2 mt-4">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      roadmap.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      roadmap.status === 'approved' ? 'bg-green-100 text-green-800' :
                      roadmap.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {roadmap.status ? roadmap.status.charAt(0).toUpperCase() + roadmap.status.slice(1) : 'Draft'}
                    </span>
                    <span className="text-xs text-gray-600 py-1">
                      {new Date(roadmap.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-blue-600">{roadmap.phases.length}</div>
                  <p className="text-xs text-gray-600">Phases</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
