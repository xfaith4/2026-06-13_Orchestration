import { describe, it, expect, beforeEach } from 'vitest';
import { RunCompletion } from '../../src/services/run-completion.js';
import { Run, ExecutionPhase, ExecutionTask, RunSummary } from '@unifiedaitoolbox/shared';

describe('RunCompletion', () => {
  let completion: RunCompletion;
  let run: Run;

  beforeEach(() => {
    completion = new RunCompletion();

    // Create a sample run with multiple phases and tasks
    const task1: ExecutionTask = {
      id: 'task-1',
      name: 'Task 1',
      description: 'First task',
      status: 'completed',
      startedAt: new Date(Date.now() - 5000).toISOString(),
      completedAt: new Date().toISOString(),
      dependencies: [],
    };

    const task2: ExecutionTask = {
      id: 'task-2',
      name: 'Task 2',
      description: 'Second task',
      status: 'failed',
      error: 'Validation failed',
      startedAt: new Date(Date.now() - 3000).toISOString(),
      completedAt: new Date().toISOString(),
      dependencies: ['task-1'],
    };

    const task3: ExecutionTask = {
      id: 'task-3',
      name: 'Task 3',
      description: 'Third task',
      status: 'completed',
      startedAt: new Date(Date.now() - 2000).toISOString(),
      completedAt: new Date().toISOString(),
      dependencies: [],
    };

    const phase1: ExecutionPhase = {
      id: 'phase-1',
      number: 1,
      name: 'Phase 1',
      goal: 'First phase',
      tasks: [task1, task2],
      status: 'failed',
      startedAt: new Date(Date.now() - 5000).toISOString(),
      completedAt: new Date().toISOString(),
      dependencies: [],
    };

    const phase2: ExecutionPhase = {
      id: 'phase-2',
      number: 2,
      name: 'Phase 2',
      goal: 'Second phase',
      tasks: [task3],
      status: 'completed',
      startedAt: new Date(Date.now() - 2000).toISOString(),
      completedAt: new Date().toISOString(),
      dependencies: ['phase-1'],
    };

    run = {
      id: 'run-1',
      createdAt: new Date(Date.now() - 10000).toISOString(),
      updatedAt: new Date().toISOString(),
      roadmapId: 'roadmap-1',
      applicationId: 'app-1',
      title: 'Test Run',
      description: 'A test run',
      phases: [phase1, phase2],
      status: 'failed',
      startedAt: new Date(Date.now() - 10000).toISOString(),
      completedAt: new Date().toISOString(),
      totalCost: {
        tokenInputs: 1000,
        tokenOutputs: 500,
        estimatedCost: 0.05,
        currency: 'USD',
      },
      phaseCosts: [
        {
          phaseId: 'phase-1',
          phaseName: 'Phase 1',
          tokenInputs: 600,
          tokenOutputs: 300,
          estimatedCost: 0.03,
          currency: 'USD',
          taskCosts: [],
        },
        {
          phaseId: 'phase-2',
          phaseName: 'Phase 2',
          tokenInputs: 400,
          tokenOutputs: 200,
          estimatedCost: 0.02,
          currency: 'USD',
          taskCosts: [],
        },
      ],
    };
  });

  describe('Summary generation', () => {
    it('should generate summary for completed run', () => {
      const startTime = new Date(Date.now() - 10000);
      const completionTime = new Date();

      const summary = completion.generateSummary(run, startTime, completionTime);

      expect(summary).toBeDefined();
      expect(summary.runId).toBe('run-1');
      expect(summary.success).toBe(false);
      expect(summary.outcome).toBe('partial');
    });

    it('should set success to true when all tasks complete', () => {
      run.phases[0].tasks.forEach(t => (t.status = 'completed'));
      run.phases[0].status = 'completed';

      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.success).toBe(true);
      expect(summary.outcome).toBe('completed');
    });

    it('should set outcome to failed when all tasks fail', () => {
      run.phases.forEach(p => {
        p.tasks.forEach(t => (t.status = 'failed'));
        p.status = 'failed';
      });

      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.outcome).toBe('failed');
      expect(summary.success).toBe(false);
    });
  });

  describe('Task result aggregation', () => {
    it('should aggregate all task results', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.taskResults).toHaveLength(3);
    });

    it('should count completed, failed, and skipped tasks', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.tasksCompleted).toBe(2);
      expect(summary.tasksFailed).toBe(1);
      expect(summary.tasksSkipped).toBe(0);
    });

    it('should track task names and IDs', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.taskResults.some(t => t.taskId === 'task-1')).toBe(true);
      expect(summary.taskResults.some(t => t.taskName === 'Task 2')).toBe(true);
    });

    it('should capture task errors', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      const failedTask = summary.taskResults.find(t => t.status === 'failed');
      expect(failedTask?.error).toBe('Validation failed');
    });
  });

  describe('Failure aggregation', () => {
    it('should aggregate failures', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.failures).toHaveLength(1);
      expect(summary.failures[0].taskId).toBe('task-2');
      expect(summary.failures[0].error).toBe('Validation failed');
    });

    it('should infer error type', () => {
      run.phases[0].tasks[1].error = 'Network timeout';
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.failures[0].errorType).toBe('transient');
    });

    it('should infer severity', () => {
      run.phases[0].tasks[1].error = 'Data error in field processing';
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.failures[0].severity).toBe('high');
    });
  });

  describe('Cost calculation', () => {
    it('should calculate total cost', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.totalCost).toBe(0.05);
    });

    it('should break down cost by phase', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.costByPhase['phase-1']).toBe(0.03);
      expect(summary.costByPhase['phase-2']).toBe(0.02);
    });

    it('should handle missing phase costs', () => {
      run.phaseCosts = undefined;
      run.totalCost = { tokenInputs: 100, tokenOutputs: 50, estimatedCost: 0.02, currency: 'USD' };

      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.totalCost).toBe(0.02);
    });
  });

  describe('Lessons learned', () => {
    it('should generate lessons for slow tasks', () => {
      // Make all tasks take longer - need average > 5000ms
      // Task 1: 6000ms, Task 2: 6000ms, Task 3: 6000ms = avg 6000ms
      const baseTime = Date.now();
      run.phases[0].tasks[0].startedAt = new Date(baseTime - 12000).toISOString();
      run.phases[0].tasks[0].completedAt = new Date(baseTime - 6000).toISOString();
      run.phases[0].tasks[1].startedAt = new Date(baseTime - 6000).toISOString();
      run.phases[0].tasks[1].completedAt = new Date(baseTime - 0).toISOString();
      run.phases[1].tasks[0].startedAt = new Date(baseTime - 6000).toISOString();
      run.phases[1].tasks[0].completedAt = new Date(baseTime).toISOString();

      const summary = completion.generateSummary(run, new Date(baseTime - 10000), new Date(baseTime + 2000));

      const perfLesson = summary.lessonsLearned.find(l => l.category === 'performance');
      expect(perfLesson).toBeDefined();
    });

    it('should generate lessons for failures', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      const reliabilityLesson = summary.lessonsLearned.find(l => l.category === 'reliability');
      expect(reliabilityLesson).toBeDefined();
      expect(reliabilityLesson?.affectedTasks).toContain('task-2');
    });

    it('should generate lessons for high costs', () => {
      // Update both totalCost and phaseCosts so cost accumulation works
      // Need > 50 for high priority
      run.totalCost!.estimatedCost = 60;
      if (run.phaseCosts) {
        run.phaseCosts[0].estimatedCost = 35;
        run.phaseCosts[1].estimatedCost = 25;
      }

      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      const costLesson = summary.lessonsLearned.find(l => l.category === 'cost');
      expect(costLesson).toBeDefined();
      expect(costLesson?.priority).toBe('high');
    });

    it('should include action items in lessons', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      for (const lesson of summary.lessonsLearned) {
        if (lesson.actionItems) {
          expect(lesson.actionItems.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Duration calculation', () => {
    it('should calculate run duration', () => {
      const startTime = new Date(Date.now() - 10000);
      const completionTime = new Date();

      const summary = completion.generateSummary(run, startTime, completionTime);

      expect(summary.duration).toBeGreaterThanOrEqual(9900);
      expect(summary.duration).toBeLessThanOrEqual(10100);
    });

    it('should track timestamps', () => {
      const startTime = new Date(Date.now() - 10000);
      const completionTime = new Date();

      const summary = completion.generateSummary(run, startTime, completionTime);

      expect(summary.startedAt).toBeDefined();
      expect(summary.completedAt).toBeDefined();
    });
  });

  describe('Artifact tracking', () => {
    it('should include artifact statistics', () => {
      const artifacts = {
        totalCount: 5,
        totalSize: 1024 * 1024,
        byType: { code: 2, log: 3 },
      };

      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date(), artifacts);

      expect(summary.artifacts.totalCount).toBe(5);
      expect(summary.artifacts.totalSize).toBe(1024 * 1024);
    });

    it('should default to empty artifacts if not provided', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.artifacts.totalCount).toBe(0);
      expect(summary.artifacts.totalSize).toBe(0);
    });
  });

  describe('Report generation', () => {
    it('should generate readable report', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());
      const report = completion.getSummaryReport(summary);

      expect(report).toContain('RUN COMPLETION SUMMARY');
      expect(report).toContain('Task Summary');
      expect(report).toContain('Cost Summary');
    });

    it('should include failure details in report', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());
      const report = completion.getSummaryReport(summary);

      expect(report).toContain('Failures');
      expect(report).toContain('Task 2');
    });

    it('should include lessons in report', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());
      const report = completion.getSummaryReport(summary);

      expect(report).toContain('Lessons Learned');
    });

    it('should format cost correctly', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());
      const report = completion.getSummaryReport(summary);

      expect(report).toContain('$0.05');
    });
  });

  describe('Outcome determination', () => {
    it('should return completed when no failures', () => {
      run.phases.forEach(p => {
        p.tasks.forEach(t => (t.status = 'completed'));
        p.status = 'completed';
      });

      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.outcome).toBe('completed');
    });

    it('should return failed when all tasks fail', () => {
      run.phases.forEach(p => {
        p.tasks.forEach(t => (t.status = 'failed'));
        p.status = 'failed';
      });

      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.outcome).toBe('failed');
    });

    it('should return partial for mixed success/failure', () => {
      const summary = completion.generateSummary(run, new Date(Date.now() - 10000), new Date());

      expect(summary.outcome).toBe('partial');
    });
  });
});
