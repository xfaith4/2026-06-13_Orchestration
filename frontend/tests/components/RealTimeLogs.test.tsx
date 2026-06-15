import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RealTimeLogs } from '../../src/components/RealTimeLogs';
import { ExecutionLog } from '../../src/hooks/useExecutionUpdates';

describe('RealTimeLogs', () => {
  const createMockLog = (overrides?: Partial<ExecutionLog>): ExecutionLog => ({
    id: 'log-1',
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Test log message',
    ...overrides,
  });

  it('should render logs container', () => {
    const logs: ExecutionLog[] = [];
    render(<RealTimeLogs logs={logs} runId="run-1" />);

    expect(screen.getByText('No logs yet')).toBeInTheDocument();
  });

  it('should display log messages', () => {
    const logs = [
      createMockLog({ message: 'Task started' }),
      createMockLog({ level: 'error', message: 'Task failed' }),
    ];

    render(<RealTimeLogs logs={logs} runId="run-1" />);

    expect(screen.getByText('Task started')).toBeInTheDocument();
    expect(screen.getByText('Task failed')).toBeInTheDocument();
  });

  it('should display log levels', () => {
    const logs = [
      createMockLog({ level: 'info' }),
      createMockLog({ level: 'warn' }),
      createMockLog({ level: 'error' }),
      createMockLog({ level: 'debug' }),
    ];

    render(<RealTimeLogs logs={logs} runId="run-1" />);

    expect(screen.getByText('[INFO]')).toBeInTheDocument();
    expect(screen.getByText('[WARN]')).toBeInTheDocument();
    expect(screen.getByText('[ERROR]')).toBeInTheDocument();
    expect(screen.getByText('[DEBUG]')).toBeInTheDocument();
  });

  it('should filter logs by level', () => {
    const logs = [
      createMockLog({ level: 'info', message: 'Info message' }),
      createMockLog({ level: 'error', message: 'Error message' }),
    ];

    render(<RealTimeLogs logs={logs} runId="run-1" />);

    // Initially should show all logs
    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Click error filter
    const errorButton = screen.getByRole('button', { name: /Error/i });
    fireEvent.click(errorButton);

    // Should only show error logs
    expect(screen.queryByText('Info message')).not.toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should search logs by message', () => {
    const logs = [
      createMockLog({ message: 'Task started' }),
      createMockLog({ message: 'Task completed' }),
    ];

    render(<RealTimeLogs logs={logs} runId="run-1" />);

    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'started' } });

    expect(screen.getByText('Task started')).toBeInTheDocument();
    expect(screen.queryByText('Task completed')).not.toBeInTheDocument();
  });

  it('should search logs by source', () => {
    const logs = [
      createMockLog({ message: 'Agent A message', source: 'AgentA' }),
      createMockLog({ message: 'Agent B message', source: 'AgentB' }),
    ];

    render(<RealTimeLogs logs={logs} runId="run-1" />);

    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'AgentA' } });

    expect(screen.getByText('Agent A message')).toBeInTheDocument();
    expect(screen.queryByText('Agent B message')).not.toBeInTheDocument();
  });

  it('should display log statistics', () => {
    const logs = [
      createMockLog({ level: 'info' }),
      createMockLog({ level: 'info' }),
      createMockLog({ level: 'warn' }),
      createMockLog({ level: 'error' }),
    ];

    render(<RealTimeLogs logs={logs} runId="run-1" />);

    expect(screen.getByText(/All \(4\)/)).toBeInTheDocument();
    expect(screen.getByText(/Info \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Warn \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Error \(1\)/)).toBeInTheDocument();
  });

  it('should toggle auto-scroll', () => {
    const logs = [createMockLog()];
    render(<RealTimeLogs logs={logs} runId="run-1" />);

    const autoScrollButton = screen.getByText('Auto-scroll ON');
    expect(autoScrollButton).toBeInTheDocument();

    fireEvent.click(autoScrollButton);

    const offButton = screen.getByText('Auto-scroll OFF');
    expect(offButton).toBeInTheDocument();
  });

  it('should display log source badges', () => {
    const logs = [
      createMockLog({ source: 'Designer' }),
      createMockLog({ source: 'Engineer' }),
    ];

    render(<RealTimeLogs logs={logs} runId="run-1" />);

    expect(screen.getByText('Designer')).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
  });

  it('should display phase and task IDs when present', () => {
    const logs = [
      createMockLog({ phaseId: 'phase-1', taskId: 'task-1' }),
    ];

    render(<RealTimeLogs logs={logs} runId="run-1" />);

    expect(screen.getByText(/Phase: phase-1/)).toBeInTheDocument();
    expect(screen.getByText(/Task: task-1/)).toBeInTheDocument();
  });

  it('should handle no matching logs message', () => {
    const logs = [createMockLog({ level: 'info' })];
    render(<RealTimeLogs logs={logs} runId="run-1" />);

    // Filter to error
    const errorButton = screen.getByRole('button', { name: /Error/i });
    fireEvent.click(errorButton);

    expect(screen.getByText('No logs match the current filter')).toBeInTheDocument();
  });

  it('should display timestamp in readable format', () => {
    const now = new Date();
    const logs = [createMockLog({ timestamp: now.toISOString() })];

    render(<RealTimeLogs logs={logs} runId="run-1" />);

    // Should display time string
    const timeString = now.toLocaleTimeString();
    const timeElements = screen.getAllByText(timeString);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('should show log count', () => {
    const logs = [
      createMockLog(),
      createMockLog(),
      createMockLog(),
    ];

    render(<RealTimeLogs logs={logs} runId="run-1" />);

    expect(screen.getByText(/Showing 3 of 3 logs/)).toBeInTheDocument();
  });
});
