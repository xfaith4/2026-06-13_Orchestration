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

export function useExecutionUpdates({
  runId,
  pollingInterval = 2000,
  enabled = true,
}: UseExecutionUpdatesOptions) {
  const [data, setData] = useState<ExecutionUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled || !runId) return;

    const fetchUpdate = async () => {
      try {
        const [run, logs] = await Promise.all([
          apiClient.get<Run>(`/runs/${runId}`),
          apiClient.get<ExecutionLog[]>(`/runs/${runId}/logs`).catch(() => [] as ExecutionLog[]),
        ]);

        setData({
          run,
          logs: logs ?? [],
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

  return {
    data,
    loading,
    error,
  };
}
