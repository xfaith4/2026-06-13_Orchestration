import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExecutionConsole } from '../../src/pages/ExecutionConsole';
import { apiClient } from '../../src/services/api';
import { useExecutionUpdates } from '../../src/hooks/useExecutionUpdates';

vi.mock('../../src/services/api');
vi.mock('../../src/hooks/useExecutionUpdates');

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'run-1' }),
    useNavigate: () => navigateMock,
  };
});

describe('ExecutionConsole repair workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useExecutionUpdates as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        run: {
          id: 'run-1',
          title: 'Failed run',
          description: 'Failure scenario',
          status: 'failed',
          errorMessage: 'Command failed',
          phases: [],
        },
        logs: [],
        lastUpdate: new Date(),
      },
      loading: false,
      error: null,
    });

    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      runError: 'Command failed',
      overallClassification: {
        failureType: 'command_failed',
        severity: 'high',
        errorType: 'runtime',
        confidence: 0.9,
        evidence: ['Non-zero exit code'],
      },
      failedTasks: [
        {
          taskId: 'task-1',
          taskName: 'Execute build',
          phaseId: 'phase-1',
          error: 'Build failed',
          classification: {
            failureType: 'command_failed',
            severity: 'high',
            errorType: 'runtime',
            confidence: 0.9,
            evidence: ['Build script exited 1'],
          },
          repairOptions: [
            {
              strategy: 'retry',
              priority: 3,
              description: 'Retry phase execution',
              riskLevel: 'low',
            },
          ],
        },
      ],
    });
  });

  it('renders failure analysis and recovery actions in modal', async () => {
    render(<ExecutionConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Review Error' }));

    expect(await screen.findByText('Run Failed — Recovery Options')).toBeInTheDocument();
    expect(screen.getByText('Failure Analysis')).toBeInTheDocument();
    expect(screen.getByText('Recovery Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Run' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip Failed Phase' })).toBeInTheDocument();
  });

  it('calls backend resume endpoint when retry is clicked', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});

    render(<ExecutionConsole />);
    fireEvent.click(screen.getByRole('button', { name: 'Review Error' }));

    const retryButton = await screen.findByRole('button', { name: 'Retry Run' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/runs/run-1/resume', {});
    });
  });

  it('shows inline error when retry endpoint fails', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Resume failed'));

    render(<ExecutionConsole />);
    fireEvent.click(screen.getByRole('button', { name: 'Review Error' }));

    const retryButton = await screen.findByRole('button', { name: 'Retry Run' });
    fireEvent.click(retryButton);

    expect(await screen.findByText('Resume failed')).toBeInTheDocument();
  });

  it('calls backend skip-phase endpoint when skip is clicked', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});

    render(<ExecutionConsole />);
    fireEvent.click(screen.getByRole('button', { name: 'Review Error' }));

    const skipButton = await screen.findByRole('button', { name: 'Skip Failed Phase' });
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/runs/run-1/skip-phase', {});
    });
  });
});
