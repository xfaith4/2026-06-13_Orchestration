import { useEffect, useState, useRef } from 'react';
import { Run } from '../types';
import { apiClient } from '../services/api';

export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  phaseId?: string;
  taskId?: string;
  source?: string;
}

export interface ExecutionUpdate {
  run: Run;
  logs: ExecutionLog[];
  lastUpdate: Date;
}

interface UseExecutionUpdatesOptions {
  runId: string;
  pollingInterval?: number; // ms, default 2000
  enabled?: boolean;
}

// Mock logs storage - in production, logs would come from backend
const mockLogs = new Map<string, ExecutionLog[]>();

export function useExecutionUpdates({
  runId,
  pollingInterval = 2000,
  enabled = true,
}: UseExecutionUpdatesOptions) {
  const [data, setData] = useState<ExecutionUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !runId) return;

    const fetchUpdate = async () => {
      try {
        const run = await apiClient.get<Run>(`/runs/${runId}`);

        // Get mock logs for this run (in real implementation, fetch from backend)
        const logs = mockLogs.get(runId) || [];

        setData({
          run,
          logs,
          lastUpdate: new Date(),
        });
        setError(null);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch updates');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchUpdate();

    // Set up polling
    const startPolling = () => {
      pollTimeoutRef.current = setTimeout(() => {
        fetchUpdate();
        startPolling();
      }, pollingInterval);
    };

    startPolling();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [runId, pollingInterval, enabled]);

  // Function to add logs (for testing/simulation)
  const addLog = (log: ExecutionLog) => {
    if (!mockLogs.has(runId)) {
      mockLogs.set(runId, []);
    }
    mockLogs.get(runId)!.push(log);

    // Update state if data exists
    if (data) {
      setData({
        ...data,
        logs: mockLogs.get(runId)!,
        lastUpdate: new Date(),
      });
    }
  };

  // Function to clear logs
  const clearLogs = () => {
    mockLogs.delete(runId);
    if (data) {
      setData({
        ...data,
        logs: [],
        lastUpdate: new Date(),
      });
    }
  };

  return {
    data,
    loading,
    error,
    addLog,
    clearLogs,
  };
}
