import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExecutionUpdates } from '../../src/hooks/useExecutionUpdates';
import { apiClient } from '../../src/services/api';

vi.mock('../../src/services/api');

const mockRun = {
  id: 'run-1',
  title: 'Test Run',
  status: 'running',
  phases: [],
};

const mockLogs = [
  { id: 'log-1', timestamp: new Date().toISOString(), level: 'info', message: 'Started' },
];

describe('useExecutionUpdates', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should fetch initial run data and logs from the API', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockRun)
      .mockResolvedValueOnce(mockLogs);

    const { result } = renderHook(() =>
      useExecutionUpdates({ runId: 'run-1', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.run).toEqual(mockRun);
    expect(result.current.data?.logs).toEqual(mockLogs);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should call /runs/:id/logs endpoint for log data', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockRun)
      .mockResolvedValueOnce([]);

    renderHook(() => useExecutionUpdates({ runId: 'run-1', enabled: true }));

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/runs/run-1/logs');
    });
  });

  it('should return empty logs array when logs endpoint fails', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockRun)
      .mockRejectedValueOnce(new Error('logs endpoint not found'));

    const { result } = renderHook(() =>
      useExecutionUpdates({ runId: 'run-1', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.logs).toEqual([]);
  });

  it('should handle run fetch errors', async () => {
    const error = new Error('Network error');
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() =>
      useExecutionUpdates({ runId: 'run-1', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should poll for updates at specified interval', async () => {
    vi.useFakeTimers();

    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockRun)
      .mockResolvedValueOnce([])
      .mockResolvedValue(mockRun);

    renderHook(() =>
      useExecutionUpdates({ runId: 'run-1', pollingInterval: 1000, enabled: true })
    );

    // Initial fetch may include immediate timer scheduling under fake timers.
    await vi.runOnlyPendingTimersAsync();
    expect((apiClient.get as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);

    await vi.advanceTimersByTimeAsync(1000);

    expect((apiClient.get as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('should not poll when disabled', () => {
    renderHook(() => useExecutionUpdates({ runId: 'run-1', enabled: false }));

    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('should not poll when runId is empty', () => {
    renderHook(() => useExecutionUpdates({ runId: '', enabled: true }));

    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
