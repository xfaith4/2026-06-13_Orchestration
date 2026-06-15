import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Run } from '../types';
import { apiClient } from '../services/api';
import { useExecutionUpdates, ExecutionLog } from '../hooks/useExecutionUpdates';
import { ExecutionProgress } from '../components/ExecutionProgress';
import { RealTimeLogs } from '../components/RealTimeLogs';
import { CostTracker } from '../components/CostTracker';
import { ErrorDisplay } from '../components/ErrorDisplay';

type ViewMode = 'overview' | 'logs' | 'costs';

export function ExecutionConsole() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRepairModal, setShowRepairModal] = useState(false);

  const { data, loading, error, addLog, clearLogs } = useExecutionUpdates({
    runId: id || '',
    pollingInterval: 2000,
    enabled: !!id,
  });

  const run = data?.run;

  // Auto-refresh run status when it changes to completed or failed
  useEffect(() => {
    if (run && (run.status === 'completed' || run.status === 'failed')) {
      // Could trigger auto-refresh here if needed
    }
  }, [run?.status]);

  const handleStartRun = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const updated = await apiClient.patch<Run>(`/runs/${id}/start`, {});
      // Update would be auto-fetched by polling
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
      const updated = await apiClient.patch<Run>(`/runs/${id}/pause`, {});
      // Update would be auto-fetched by polling
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to pause run');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeRun = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      setActionError(null);
      // Resume would use the start endpoint since there's no separate resume
      const updated = await apiClient.patch<Run>(`/runs/${id}/start`, {});
      // Update would be auto-fetched by polling
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to resume run');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRepair = async (repairId: string) => {
    // This would be called when user approves a repair suggestion
    // In a full implementation, this would update the run's repair state
    setShowRepairModal(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading execution console...</div>
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

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <button
                onClick={() => navigate('/runs')}
                className="text-blue-600 hover:text-blue-800 text-sm mb-2"
              >
                ← Back to Runs
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{run.title}</h1>
              <p className="text-sm text-gray-600 mt-1">{run.description}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                run.status === 'draft'
                  ? 'bg-gray-100 text-gray-800'
                  : run.status === 'pending'
                  ? 'bg-blue-100 text-blue-800'
                  : run.status === 'running'
                  ? 'bg-yellow-100 text-yellow-800'
                  : run.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : run.status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-orange-100 text-orange-800'
              }`}
            >
              {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 items-center">
            {run.status === 'draft' && (
              <button
                onClick={handleStartRun}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {actionLoading ? 'Starting...' : 'Start Run'}
              </button>
            )}

            {run.status === 'running' && (
              <button
                onClick={handlePauseRun}
                disabled={actionLoading}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {actionLoading ? 'Pausing...' : 'Pause Run'}
              </button>
            )}

            {run.status === 'paused' && (
              <button
                onClick={handleResumeRun}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {actionLoading ? 'Resuming...' : 'Resume Run'}
              </button>
            )}

            {run.status === 'completed' && (
              <button
                onClick={() => navigate(`/runs/${id}`)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
              >
                View Results
              </button>
            )}

            {run.errorMessage && (
              <button
                onClick={() => setShowRepairModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
              >
                Review Error
              </button>
            )}
          </div>

          {actionError && (
            <div className="mt-4">
              <ErrorDisplay error={actionError} severity="medium" />
            </div>
          )}
        </div>
      </div>

      {/* View mode tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-8">
          <button
            onClick={() => setViewMode('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              viewMode === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('logs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              viewMode === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Logs
          </button>
          <button
            onClick={() => setViewMode('costs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              viewMode === 'costs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Costs
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'overview' && (
          <div className="max-w-6xl mx-auto">
            <ExecutionProgress run={run} />
          </div>
        )}

        {viewMode === 'logs' && (
          <div className="h-full max-w-6xl mx-auto bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <RealTimeLogs logs={data?.logs || []} runId={id || ''} />
          </div>
        )}

        {viewMode === 'costs' && (
          <div className="max-w-6xl mx-auto">
            <CostTracker run={run} />
          </div>
        )}
      </div>

      {/* Repair Modal */}
      {showRepairModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Error Details</h2>
            </div>

            <div className="px-6 py-4 space-y-4">
              {run.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-sm font-semibold text-red-800">Error Message</p>
                  <p className="text-sm text-red-700 mt-2">{run.errorMessage}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm font-semibold text-blue-800">Suggested Actions</p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Review the error message above</li>
                  <li>Check the logs for more details</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowRepairModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleApproveRepair('repair-1');
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
