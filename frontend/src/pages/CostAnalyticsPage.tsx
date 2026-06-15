import { useEffect, useState } from 'react';
import { Run } from '../types';
import { apiClient } from '../services/api';
import { CostDashboard } from '../components/CostDashboard';

export function CostAnalyticsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<Run[]>('/runs');
        setRuns(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load runs');
        setRuns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading cost analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  const currentRun = runs.length > 0 ? runs[runs.length - 1] : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cost Analytics</h1>
        <p className="mt-2 text-gray-600">
          Advanced cost tracking, trends, and budget analysis across all runs
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">No runs available for cost analysis yet.</p>
        </div>
      ) : (
        <CostDashboard runs={runs} currentRun={currentRun} />
      )}
    </div>
  );
}
