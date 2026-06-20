import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RepairOptions } from '../../src/components/RepairOptions';

describe('RepairOptions', () => {
  it('calls action handlers for retry, skip, and escalate', () => {
    const onRetry = vi.fn();
    const onSkipPhase = vi.fn();
    const onEscalate = vi.fn();

    render(
      <RepairOptions
        options={[]}
        loading={false}
        error={null}
        onRetry={onRetry}
        onSkipPhase={onSkipPhase}
        onEscalate={onEscalate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry Run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip Failed Phase' }));
    fireEvent.click(screen.getByRole('button', { name: 'Escalate' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSkipPhase).toHaveBeenCalledTimes(1);
    expect(onEscalate).toHaveBeenCalledTimes(1);
  });

  it('shows inline error and loading state', () => {
    render(
      <RepairOptions
        options={[]}
        loading={true}
        error="Unable to patch run"
        onRetry={vi.fn()}
        onSkipPhase={vi.fn()}
        onEscalate={vi.fn()}
      />
    );

    expect(screen.getByText('Unable to patch run')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip Failed Phase' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeDisabled();
  });

  it('renders suggested strategies sorted by priority', () => {
    render(
      <RepairOptions
        options={[
          {
            strategy: 'manual',
            priority: 1,
            description: 'Needs operator approval',
            riskLevel: 'medium',
          },
          {
            strategy: 'retry',
            priority: 3,
            description: 'Retry with same inputs',
            riskLevel: 'low',
            estimatedDuration: 1200,
            instructions: ['Resume run', 'Re-check result'],
          },
        ]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onSkipPhase={vi.fn()}
        onEscalate={vi.fn()}
      />
    );

    expect(screen.getByText('Suggested Strategies')).toBeInTheDocument();
    const strategyCards = screen.getAllByText(/Retry with same inputs|Needs operator approval/);
    expect(strategyCards[0]).toHaveTextContent('Retry with same inputs');
    expect(strategyCards[1]).toHaveTextContent('Needs operator approval');
    expect(screen.getByText('Retry with same inputs')).toBeInTheDocument();
    expect(screen.getByText('~1s')).toBeInTheDocument();
  });
});
