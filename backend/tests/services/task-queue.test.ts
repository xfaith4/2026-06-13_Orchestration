import { describe, it, expect, beforeEach } from 'vitest';
import { TaskQueue } from '@fuhrhaus/orchestration-core';
import { ExecutionPhase, ExecutionTask } from '@unifiedaitoolbox/shared';

describe('TaskQueue', () => {
  let phase: ExecutionPhase;

  beforeEach(() => {
    // Create a sample phase with tasks
    const task1: ExecutionTask = {
      id: 'task-1',
      name: 'Task 1',
      description: 'First task',
      status: 'pending',
      dependencies: [],
    };

    const task2: ExecutionTask = {
      id: 'task-2',
      name: 'Task 2',
      description: 'Second task',
      status: 'pending',
      dependencies: ['task-1'],
    };

    const task3: ExecutionTask = {
      id: 'task-3',
      name: 'Task 3',
      description: 'Third task',
      status: 'pending',
      dependencies: ['task-1'],
    };

    const task4: ExecutionTask = {
      id: 'task-4',
      name: 'Task 4',
      description: 'Fourth task',
      status: 'pending',
      dependencies: ['task-2', 'task-3'],
    };

    phase = {
      id: 'phase-1',
      number: 1,
      name: 'Phase 1',
      goal: 'Test phase',
      tasks: [task1, task2, task3, task4],
      status: 'pending',
      dependencies: [],
    };
  });

  describe('Queue initialization', () => {
    it('should initialize queue with all tasks in pending state', () => {
      const queue = new TaskQueue(phase);
      const state = queue.getState();

      expect(state.pending.size).toBe(4);
      expect(state.executing.size).toBe(0);
      expect(state.completed.size).toBe(0);
    });

    it('should reject circular dependencies', () => {
      const taskWithCycle: ExecutionTask = {
        id: 'cycle-task',
        name: 'Cycle Task',
        description: 'Task with cycle',
        status: 'pending',
        dependencies: ['task-4'],
      };

      // Make task-1 depend on cycle-task to create cycle
      const cyclePhase: ExecutionPhase = {
        ...phase,
        tasks: [
          ...phase.tasks,
          {
            ...phase.tasks[0],
            dependencies: ['cycle-task'],
          },
          taskWithCycle,
        ],
      };

      expect(() => new TaskQueue(cyclePhase)).toThrow('Circular dependency detected');
    });
  });

  describe('Dependency resolution', () => {
    it('should identify tasks with no dependencies as ready', () => {
      const queue = new TaskQueue(phase);
      const ready = queue.getReadyTasks();

      expect(ready).toContain('task-1');
      expect(ready.length).toBe(1);
    });

    it('should not include tasks with unsatisfied dependencies', () => {
      const queue = new TaskQueue(phase);
      const ready = queue.getReadyTasks();

      expect(ready).not.toContain('task-2');
      expect(ready).not.toContain('task-3');
      expect(ready).not.toContain('task-4');
    });

    it('should identify tasks as ready after dependencies complete', () => {
      const queue = new TaskQueue(phase);

      // Complete task-1
      queue.startTask('task-1');
      queue.completeTask('task-1');

      const ready = queue.getReadyTasks();
      expect(ready).toContain('task-2');
      expect(ready).toContain('task-3');
      expect(ready).not.toContain('task-4');
    });

    it('should identify tasks ready for parallel execution', () => {
      const queue = new TaskQueue(phase);

      queue.startTask('task-1');
      queue.completeTask('task-1');

      const ready = queue.getReadyTasks();
      // task-2 and task-3 can execute in parallel
      expect(ready.sort()).toEqual(['task-2', 'task-3'].sort());
    });

    it('should get execution plan in topological order', () => {
      const queue = new TaskQueue(phase);
      const plan = queue.getExecutionPlan();

      // plan[0] should contain task-1
      expect(plan[0]).toContain('task-1');
      // plan[1] should contain task-2 and task-3
      expect(plan[1].sort()).toEqual(['task-2', 'task-3'].sort());
      // plan[2] should contain task-4
      expect(plan[2]).toContain('task-4');
    });
  });

  describe('Queue progression', () => {
    it('should start a task', () => {
      const queue = new TaskQueue(phase);

      queue.startTask('task-1');
      const state = queue.getState();

      expect(state.pending.has('task-1')).toBe(false);
      expect(state.executing.has('task-1')).toBe(true);
    });

    it('should complete a task', () => {
      const queue = new TaskQueue(phase);

      queue.startTask('task-1');
      queue.completeTask('task-1', { result: 'success' });

      const state = queue.getState();
      expect(state.executing.has('task-1')).toBe(false);
      expect(state.completed.has('task-1')).toBe(true);

      const result = queue.getResult('task-1');
      expect(result?.status).toBe('completed');
      expect(result?.output).toEqual({ result: 'success' });
    });

    it('should fail a task', () => {
      const queue = new TaskQueue(phase);

      queue.startTask('task-1');
      queue.failTask('task-1', 'Task execution error');

      const state = queue.getState();
      expect(state.executing.has('task-1')).toBe(false);
      expect(state.failed.has('task-1')).toBe(true);

      const result = queue.getResult('task-1');
      expect(result?.status).toBe('failed');
      expect(result?.error).toBe('Task execution error');
    });

    it('should detect queue completion', () => {
      const queue = new TaskQueue(phase);

      // Complete all tasks in order
      queue.startTask('task-1');
      queue.completeTask('task-1');

      queue.startTask('task-2');
      queue.completeTask('task-2');

      queue.startTask('task-3');
      queue.completeTask('task-3');

      queue.startTask('task-4');
      queue.completeTask('task-4');

      expect(queue.isComplete()).toBe(true);
      expect(queue.hasFailures()).toBe(false);
    });
  });

  describe('Failure handling', () => {
    it('should retry failed tasks', () => {
      const queue = new TaskQueue(phase);

      queue.startTask('task-1');
      queue.failTask('task-1', 'Error');

      const retried = queue.retryTask('task-1');
      expect(retried).toBe(true);

      const state = queue.getState();
      expect(state.pending.has('task-1')).toBe(true);
      expect(state.failed.has('task-1')).toBe(false);
    });

    it('should respect max retry limit', () => {
      const queue = new TaskQueue(phase);

      queue.startTask('task-1');
      queue.failTask('task-1', 'Error', 0);

      // Retry max 3 times
      queue.retryTask('task-1');
      queue.startTask('task-1');
      queue.failTask('task-1', 'Error', 1);

      queue.retryTask('task-1');
      queue.startTask('task-1');
      queue.failTask('task-1', 'Error', 2);

      queue.retryTask('task-1');
      queue.startTask('task-1');
      queue.failTask('task-1', 'Error', 3);

      const retried = queue.retryTask('task-1');
      expect(retried).toBe(false);

      const state = queue.getState();
      expect(state.failed.has('task-1')).toBe(true);
    });

    it('should skip failed tasks', () => {
      const queue = new TaskQueue(phase);

      queue.startTask('task-1');
      queue.failTask('task-1', 'Error');

      queue.skipTask('task-1');

      const state = queue.getState();
      expect(state.skipped.has('task-1')).toBe(true);
      expect(state.failed.has('task-1')).toBe(false);

      const result = queue.getResult('task-1');
      expect(result?.status).toBe('skipped');
    });

    it('should allow dependent tasks to proceed when dependency is skipped', () => {
      const queue = new TaskQueue(phase);

      queue.startTask('task-1');
      queue.failTask('task-1', 'Error');
      queue.skipTask('task-1');

      // Even though task-1 is skipped, task-2 and task-3 should be ready
      const ready = queue.getReadyTasks();
      expect(ready).toContain('task-2');
      expect(ready).toContain('task-3');
    });
  });

  describe('Task information', () => {
    it('should get task details', () => {
      const queue = new TaskQueue(phase);
      const task = queue.getTask('task-1');

      expect(task?.id).toBe('task-1');
      expect(task?.name).toBe('Task 1');
    });

    it('should get task dependencies', () => {
      const queue = new TaskQueue(phase);

      const deps1 = queue.getDependencies('task-1');
      expect(deps1).toEqual([]);

      const deps2 = queue.getDependencies('task-2');
      expect(deps2).toEqual(['task-1']);

      const deps4 = queue.getDependencies('task-4');
      expect(deps4.sort()).toEqual(['task-2', 'task-3'].sort());
    });

    it('should get tasks that depend on a given task', () => {
      const queue = new TaskQueue(phase);

      const dependents1 = queue.getDependents('task-1');
      expect(dependents1.sort()).toEqual(['task-2', 'task-3'].sort());

      const dependents2 = queue.getDependents('task-2');
      expect(dependents2).toEqual(['task-4']);
    });

    it('should get queue statistics', () => {
      const queue = new TaskQueue(phase);

      const stats = queue.getStatistics();
      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(4);
      expect(stats.executing).toBe(0);
      expect(stats.completed).toBe(0);

      queue.startTask('task-1');
      queue.completeTask('task-1');

      const updatedStats = queue.getStatistics();
      expect(updatedStats.pending).toBe(3);
      expect(updatedStats.completed).toBe(1);
    });
  });

  describe('Next batch operations', () => {
    it('should get next batch of tasks', () => {
      const queue = new TaskQueue(phase);

      const batch1 = queue.getNextBatch();
      expect(batch1).toContain('task-1');
      expect(batch1.length).toBe(1);

      // Start task-1
      queue.startTask('task-1');
      const batch2 = queue.getNextBatch();
      expect(batch2.length).toBe(0); // Still executing task-1

      // Complete task-1
      queue.completeTask('task-1');
      const batch3 = queue.getNextBatch();
      expect(batch3.sort()).toEqual(['task-2', 'task-3'].sort());
    });
  });

  describe('Simple linear dependencies', () => {
    it('should handle linear task chain', () => {
      const simplePhase: ExecutionPhase = {
        id: 'linear',
        number: 1,
        name: 'Linear Phase',
        goal: 'Test linear',
        status: 'pending',
        dependencies: [],
        tasks: [
          { id: 't1', name: 'T1', description: 'T1', status: 'pending', dependencies: [] },
          { id: 't2', name: 'T2', description: 'T2', status: 'pending', dependencies: ['t1'] },
          { id: 't3', name: 'T3', description: 'T3', status: 'pending', dependencies: ['t2'] },
        ],
      };

      const queue = new TaskQueue(simplePhase);

      expect(queue.getReadyTasks()).toEqual(['t1']);

      queue.startTask('t1');
      queue.completeTask('t1');
      expect(queue.getReadyTasks()).toEqual(['t2']);

      queue.startTask('t2');
      queue.completeTask('t2');
      expect(queue.getReadyTasks()).toEqual(['t3']);
    });
  });

  describe('Results tracking', () => {
    it('should track all results', () => {
      const queue = new TaskQueue(phase);

      queue.startTask('task-1');
      queue.completeTask('task-1', { output: 'data' });

      queue.startTask('task-2');
      queue.failTask('task-2', 'Error');

      const results = queue.getAllResults();
      expect(results.length).toBe(2);
      expect(results.some(r => r.taskId === 'task-1' && r.status === 'completed')).toBe(true);
      expect(results.some(r => r.taskId === 'task-2' && r.status === 'failed')).toBe(true);
    });
  });
});
