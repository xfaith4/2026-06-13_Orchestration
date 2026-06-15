import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExecutionUpdates, ExecutionLog } from '../../src/hooks/useExecutionUpdates';
import { apiClient } from '../../src/services/api';

vi.mock('../../src/services/api');

describe('useExecutionUpdates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fetch initial run data', async () => {
    const mockRun = {
      id: 'run-1',
      title: 'Test Run',
      status: 'running',
      phases: [],
    };

    (apiClient.get as any).mockResolvedValueOnce(mockRun);

    const { result } = renderHook(() =>
      useExecutionUpdates({ runId: 'run-1', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.run).toEqual(mockRun);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Network error');
    (apiClient.get as any).mockRejectedValueOnce(error);

    const { result } = renderHook(() =>
      useExecutionUpdates({ runId: 'run-1', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should poll for updates at specified interval', async () => {
    const mockRun = {
      id: 'run-1',
      title: 'Test Run',
      status: 'running',
      phases: [],
    };

    (apiClient.get as any).mockResolvedValue(mockRun);

    const { result } = renderHook(() =>
      useExecutionUpdates({ runId: 'run-1', pollingInterval: 1000, enabled: true })
    );

    expect(apiClient.get).toHaveBeenCalledTimes(1);

    // Advance time by polling interval
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  it('should not poll when disabled', async () => {
    const mockRun = {
      id: 'run-1',
      title: 'Test Run',
      status: 'running',
      phases: [],
    };

    (apiClient.get as any).mockResolvedValue(mockRun);

    const { result } = renderHook(() =>
      useExecutionUpdates({ runId: 'run-1', enabled: false })
    );

    vi.advanceTimersByTime(5000);

    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('should allow adding logs', () => {
    const mockRun = {
      id: 'run-1',
      title: 'Test Run',
      status: 'running',
      phases: [],
    };

    (apiClient.get as any).mockResolvedValueOnce(mockRun);

    const { result } = renderHook(() =>
      useExecutionUpdates({ runId: 'run-1', enabled: true })
    );

    waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const newLog: ExecutionLog = {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Test log',
    };

    result.current.addLog(newLog);

    expect(result.current.data?.logs).toContain(newLog);
  });

  it('should allow clearing logs', () => {
    const mockRun = {
      id: 'run-1',
      title: 'Test Run',
      status: 'running',
      phases: [],
    };

    (apiClient.get as any).mockResolvedValueOnce(mockRun);

    const { result } = renderHook(() =>
      useExecutionUpdates({ runId: 'run-1', enabled: true })
    );

    waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const newLog: ExecutionLog = {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Test log',
    };

    result.current.addLog(newLog);
    expect(result.current.data?.logs.length).toBeGreaterThan(0);

    result.current.clearLogs();
    expect(result.current.data?.logs).toEqual([]);
  });

  it('should not poll when runId is empty', () => {
    const { result } = renderHook(() =>
      useExecutionUpdates({ runId: '', enabled: true })
    );

    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
