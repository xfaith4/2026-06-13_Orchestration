import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExecutionProgress } from '../../src/components/ExecutionProgress';
import { Run, ExecutionPhase, ExecutionTask } from '../../src/types';

describe('ExecutionProgress', () => {
  const createMockRun = (overrides?: Partial<Run>): Run => {
    const task1: ExecutionTask = {
      id: 'task-1',
      name: 'Task 1',
      description: 'First task',
      status: 'completed',
      dependencies: [],
    };

    const task2: ExecutionTask = {
      id: 'task-2',
      name: 'Task 2',
      description: 'Second task',
      status: 'in-progress',
      dependencies: [],
    };

    const task3: ExecutionTask = {
      id: 'task-3',
      name: 'Task 3',
      description: 'Third task',
      status: 'pending',
      dependencies: [],
    };

    const phase1: ExecutionPhase = {
      id: 'phase-1',
      number: 1,
      name: 'Phase 1',
      goal: 'First phase',
      tasks: [task1, task2],
      status: 'in-progress',
      dependencies: [],
    };

    const phase2: ExecutionPhase = {
      id: 'phase-2',
      number: 2,
      name: 'Phase 2',
      goal: 'Second phase',
      tasks: [task3],
      status: 'pending',
      dependencies: ['phase-1'],
    };

    return {
      id: 'run-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      roadmapId: 'roadmap-1',
      applicationId: 'app-1',
      title: 'Test Run',
      description: 'A test run',
      phases: [phase1, phase2],
      status: 'running',
      ...overrides,
    };
  };

  it('should render overall progress section', () => {
    const run = createMockRun();
    render(<ExecutionProgress run={run} />);

    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
  });

  it('should display correct task counts', () => {
    const run = createMockRun();
    render(<ExecutionProgress run={run} />);

    // Should show 1/3 tasks completed (task-1 is completed)
    expect(screen.getByText(/1\/3 tasks completed/)).toBeInTheDocument();
  });

  it('should display phase information', () => {
    const run = createMockRun();
    render(<ExecutionProgress run={run} />);

    expect(screen.getByText(/Phase 1: Phase 1/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 2: Phase 2/)).toBeInTheDocument();
  });

  it('should display phase goals', () => {
    const run = createMockRun();
    render(<ExecutionProgress run={run} />);

    expect(screen.getByText('First phase')).toBeInTheDocument();
    expect(screen.getByText('Second phase')).toBeInTheDocument();
  });

  it('should display phase status badges', () => {
    const run = createMockRun();
    render(<ExecutionProgress run={run} />);

    // Phase 1 is in-progress, Phase 2 is pending
    const badges = screen.getAllByText(/In-progress|Pending/);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('should display task status icons', () => {
    const run = createMockRun();
    render(<ExecutionProgress run={run} />);

    // Should render task icons/symbols
    const taskElements = screen.getAllByTitle(/Task.*-/);
    expect(taskElements.length).toBeGreaterThanOrEqual(3);
  });

  it('should show correct failure count', () => {
    const run = createMockRun({
      phases: [
        {
          id: 'phase-1',
          number: 1,
          name: 'Phase 1',
          goal: 'First phase',
          status: 'failed',
          dependencies: [],
          tasks: [
            {
              id: 'task-1',
              name: 'Task 1',
              description: 'First task',
              status: 'failed',
              dependencies: [],
            },
            {
              id: 'task-2',
              name: 'Task 2',
              description: 'Second task',
              status: 'completed',
              dependencies: [],
            },
          ],
        },
      ],
    });

    render(<ExecutionProgress run={run} />);

    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('should show 100% progress when all tasks completed', () => {
    const run = createMockRun({
      phases: [
        {
          id: 'phase-1',
          number: 1,
          name: 'Phase 1',
          goal: 'First phase',
          status: 'completed',
          dependencies: [],
          tasks: [
            {
              id: 'task-1',
              name: 'Task 1',
              description: 'First task',
              status: 'completed',
              dependencies: [],
            },
            {
              id: 'task-2',
              name: 'Task 2',
              description: 'Second task',
              status: 'completed',
              dependencies: [],
            },
          ],
        },
      ],
    });

    render(<ExecutionProgress run={run} />);

    expect(screen.getByText(/2\/2 tasks completed/)).toBeInTheDocument();
  });

  it('should display phase progress bars', () => {
    const run = createMockRun();
    const { container } = render(<ExecutionProgress run={run} />);

    // Should have progress bar divs
    const progressBars = container.querySelectorAll('.bg-gray-200.rounded-full.h-2');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});
