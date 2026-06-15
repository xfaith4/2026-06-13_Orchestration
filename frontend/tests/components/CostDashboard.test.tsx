import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostDashboard } from '../../src/components/CostDashboard';
import { Run } from '../../src/types';

describe('CostDashboard', () => {
  const createMockRun = (cost: number, id: string = 'run-1'): Run => ({
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roadmapId: 'roadmap-1',
    applicationId: 'app-1',
    title: `Test Run ${cost}`,
    description: 'Test',
    phases: [
      {
        id: 'phase-1',
        number: 1,
        name: 'Phase 1',
        goal: 'Test',
        tasks: [{ id: 'task-1', name: 'Task 1', description: 'Test', status: 'completed', dependencies: [] }],
        status: 'completed',
        dependencies: [],
      },
    ],
    status: 'completed',
    totalCost: {
      tokenInputs: Math.floor(cost * 1000),
      tokenOutputs: Math.floor(cost * 500),
      estimatedCost: cost,
      currency: 'USD',
    },
    phaseCosts: [
      {
        phaseId: 'phase-1',
        phaseName: 'Phase 1',
        tokenInputs: Math.floor(cost * 1000),
        tokenOutputs: Math.floor(cost * 500),
        estimatedCost: cost,
        currency: 'USD',
        taskCosts: [],
      },
    ],
  });

  it('should display total spent', () => {
    const runs = [createMockRun(10, 'run-1'), createMockRun(20, 'run-2')];
    render(<CostDashboard runs={runs} />);

    expect(screen.getByText(/TOTAL SPENT/i)).toBeInTheDocument();
    expect(screen.getByText(/\$30\.00/)).toBeInTheDocument();
  });

  it('should display average cost', () => {
    const runs = [createMockRun(10, 'run-1'), createMockRun(20, 'run-2')];
    render(<CostDashboard runs={runs} />);

    expect(screen.getByText(/AVERAGE COST/i)).toBeInTheDocument();
    expect(screen.getByText(/\$15\.00/)).toBeInTheDocument();
  });

  it('should display cost efficiency metrics', () => {
    const runs = [createMockRun(10, 'run-1')];
    render(<CostDashboard runs={runs} />);

    expect(screen.getByText(/COST EFFICIENCY/i)).toBeInTheDocument();
    expect(screen.getByText(/TOTAL TOKENS/i)).toBeInTheDocument();
  });

  it('should display budget status as healthy when below 75%', () => {
    const runs = [createMockRun(50, 'run-1')];
    render(<CostDashboard runs={runs} />);

    expect(screen.getByText(/HEALTHY/i)).toBeInTheDocument();
  });

  it('should display budget status as warning when 75-90%', () => {
    const runs = [createMockRun(80, 'run-1')];
    render(<CostDashboard runs={runs} />);

    expect(screen.getByText(/WARNING/i)).toBeInTheDocument();
  });

  it('should display budget status as critical when above 90%', () => {
    const runs = [createMockRun(95, 'run-1')];
    render(<CostDashboard runs={runs} />);

    expect(screen.getByText(/CRITICAL/i)).toBeInTheDocument();
  });

  it('should display current run details when provided', () => {
    const runs = [createMockRun(10, 'run-1')];
    const currentRun = createMockRun(15, 'run-2');
    render(<CostDashboard runs={runs} currentRun={currentRun} />);

    expect(screen.getByText(/Current Run/i)).toBeInTheDocument();
    expect(screen.getByText(/\$15\.00/)).toBeInTheDocument();
  });

  it('should show min and max costs', () => {
    const runs = [createMockRun(5, 'run-1'), createMockRun(20, 'run-2'), createMockRun(12, 'run-3')];
    render(<CostDashboard runs={runs} />);

    expect(screen.getByText(/LOWEST COST RUN/i)).toBeInTheDocument();
    expect(screen.getByText(/HIGHEST COST RUN/i)).toBeInTheDocument();
  });

  it('should display token usage breakdown', () => {
    const runs = [createMockRun(10, 'run-1')];
    render(<CostDashboard runs={runs} />);

    expect(screen.getByText(/Input Tokens/i)).toBeInTheDocument();
    expect(screen.getByText(/Output Tokens/i)).toBeInTheDocument();
  });

  it('should render with empty runs array', () => {
    render(<CostDashboard runs={[]} />);

    expect(screen.getByText(/TOTAL SPENT/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
  });
});
