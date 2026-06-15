import { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

interface ErrorRecord {
  id: string;
  timestamp: string;
  errorMessage: string;
  errorCode?: string;
  errorType: 'transient' | 'permanent' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
  resolvedAt?: string;
  resolution?: string;
}

interface ErrorHistoryProps {
  runId?: string;
  taskId?: string;
}

export function ErrorHistory({ runId, taskId }: ErrorHistoryProps) {
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchErrors = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = '/error-logs?resolved=false';
        if (runId) url += `&runId=${runId}`;
        if (taskId) url += `&taskId=${taskId}`;
        url += '&limit=50';

        const data = await apiClient.get<ErrorRecord[]>(url);
        setErrors(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load error history');
      } finally {
        setLoading(false);
      }
    };

    if (runId || taskId) {
      fetchErrors();
    }
  }, [runId, taskId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'transient' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-600">Loading error history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Error History</h3>
        <div className="text-gray-600">No errors recorded</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Error History</h3>
      <div className="space-y-3">
        {errors.map((err) => (
          <div key={err.id} className={`rounded-lg border p-4 ${getSeverityColor(err.severity)}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="font-semibold text-sm">{err.errorMessage}</div>
                <div className="text-xs mt-1">
                  {new Date(err.timestamp).toLocaleString()}
                </div>
              </div>
              <div className="ml-3 flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(err.errorType)}`}>
                  {err.errorType}
                </span>
              </div>
            </div>

            {err.errorCode && (
              <div className="text-xs font-mono mt-2 bg-black bg-opacity-5 rounded px-2 py-1 inline-block">
                {err.errorCode}
              </div>
            )}

            {err.maxRetries > 0 && (
              <div className="mt-2 text-xs">
                <span className="font-semibold">Retry:</span> {err.retryCount} / {err.maxRetries}
              </div>
            )}

            {err.resolvedAt && err.resolution && (
              <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-800">
                ✓ Resolved: {err.resolution}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
