import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostTracker } from '../../src/components/CostTracker';
import { Run, ExecutionPhase, CostMetrics } from '../../src/types';

describe('CostTracker', () => {
  const createMockRun = (overrides?: Partial<Run>): Run => {
    const phase1: ExecutionPhase = {
      id: 'phase-1',
      number: 1,
      name: 'Phase 1',
      goal: 'First phase',
      tasks: [],
      status: 'completed',
      dependencies: [],
    };

    const totalCost: CostMetrics = {
      tokenInputs: 1000,
      tokenOutputs: 500,
      estimatedCost: 5.0,
      currency: 'USD',
    };

    return {
      id: 'run-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      roadmapId: 'roadmap-1',
      applicationId: 'app-1',
      title: 'Test Run',
      description: 'A test run',
      phases: [phase1],
      status: 'completed',
      totalCost,
      ...overrides,
    };
  };

  it('should render cost summary section', () => {
    const run = createMockRun();
    render(<CostTracker run={run} />);

    expect(screen.getByText('Cost Summary')).toBeInTheDocument();
  });

  it('should display total cost', () => {
    const run = createMockRun({
      totalCost: {
        tokenInputs: 1000,
        tokenOutputs: 500,
        estimatedCost: 5.50,
        currency: 'USD',
      },
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText('$5.50')).toBeInTheDocument();
  });

  it('should display input tokens', () => {
    const run = createMockRun({
      totalCost: {
        tokenInputs: 2500,
        tokenOutputs: 1000,
        estimatedCost: 3.0,
        currency: 'USD',
      },
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText(/2,500/)).toBeInTheDocument();
  });

  it('should display output tokens', () => {
    const run = createMockRun({
      totalCost: {
        tokenInputs: 1000,
        tokenOutputs: 2500,
        estimatedCost: 3.0,
        currency: 'USD',
      },
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText(/2,500/)).toBeInTheDocument();
  });

  it('should show cost level LOW for under $1', () => {
    const run = createMockRun({
      totalCost: {
        tokenInputs: 100,
        tokenOutputs: 50,
        estimatedCost: 0.50,
        currency: 'USD',
      },
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('should show cost level HIGH for over $10', () => {
    const run = createMockRun({
      totalCost: {
        tokenInputs: 5000,
        tokenOutputs: 2500,
        estimatedCost: 15.0,
        currency: 'USD',
      },
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('should display phase cost breakdown', () => {
    const run = createMockRun({
      phaseCosts: [
        {
          phaseId: 'phase-1',
          phaseName: 'Phase 1',
          tokenInputs: 1000,
          tokenOutputs: 500,
          estimatedCost: 3.0,
          currency: 'USD',
          taskCosts: [],
        },
        {
          phaseId: 'phase-2',
          phaseName: 'Phase 2',
          tokenInputs: 1000,
          tokenOutputs: 500,
          estimatedCost: 2.0,
          currency: 'USD',
          taskCosts: [],
        },
      ],
      phases: [
        {
          id: 'phase-1',
          number: 1,
          name: 'Phase 1',
          goal: 'First phase',
          tasks: [],
          status: 'completed',
          dependencies: [],
        },
        {
          id: 'phase-2',
          number: 2,
          name: 'Phase 2',
          goal: 'Second phase',
          tasks: [],
          status: 'completed',
          dependencies: [],
        },
      ],
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText('Cost by Phase')).toBeInTheDocument();
    expect(screen.getByText(/Phase 1: Phase 1/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 2: Phase 2/)).toBeInTheDocument();
  });

  it('should display efficiency metrics', () => {
    const run = createMockRun({
      totalCost: {
        tokenInputs: 1000,
        tokenOutputs: 500,
        estimatedCost: 10.0,
        currency: 'USD',
      },
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText('Efficiency Metrics')).toBeInTheDocument();
    expect(screen.getByText(/COST PER PHASE/)).toBeInTheDocument();
  });

  it('should show high cost alert for cost > $10', () => {
    const run = createMockRun({
      totalCost: {
        tokenInputs: 5000,
        tokenOutputs: 2500,
        estimatedCost: 15.0,
        currency: 'USD',
      },
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText('High Cost Alert')).toBeInTheDocument();
  });

  it('should not show high cost alert for cost < $10', () => {
    const run = createMockRun({
      totalCost: {
        tokenInputs: 1000,
        tokenOutputs: 500,
        estimatedCost: 5.0,
        currency: 'USD',
      },
    });

    render(<CostTracker run={run} />);

    expect(screen.queryByText('High Cost Alert')).not.toBeInTheDocument();
  });

  it('should display currency', () => {
    const run = createMockRun({
      totalCost: {
        tokenInputs: 1000,
        tokenOutputs: 500,
        estimatedCost: 5.0,
        currency: 'EUR',
      },
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText('EUR')).toBeInTheDocument();
  });

  it('should calculate phase cost percentages', () => {
    const run = createMockRun({
      totalCost: {
        tokenInputs: 2000,
        tokenOutputs: 1000,
        estimatedCost: 10.0,
        currency: 'USD',
      },
      phaseCosts: [
        {
          phaseId: 'phase-1',
          phaseName: 'Phase 1',
          tokenInputs: 1000,
          tokenOutputs: 500,
          estimatedCost: 5.0,
          currency: 'USD',
          taskCosts: [],
        },
        {
          phaseId: 'phase-2',
          phaseName: 'Phase 2',
          tokenInputs: 1000,
          tokenOutputs: 500,
          estimatedCost: 5.0,
          currency: 'USD',
          taskCosts: [],
        },
      ],
      phases: [
        {
          id: 'phase-1',
          number: 1,
          name: 'Phase 1',
          goal: 'First phase',
          tasks: [],
          status: 'completed',
          dependencies: [],
        },
        {
          id: 'phase-2',
          number: 2,
          name: 'Phase 2',
          goal: 'Second phase',
          tasks: [],
          status: 'completed',
          dependencies: [],
        },
      ],
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText(/50.0% of total/)).toBeInTheDocument();
  });

  it('should handle missing totalCost gracefully', () => {
    const run = createMockRun({
      totalCost: undefined,
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('should handle no phases gracefully', () => {
    const run = createMockRun({
      phases: [],
    });

    render(<CostTracker run={run} />);

    expect(screen.getByText('Cost Summary')).toBeInTheDocument();
  });
});
