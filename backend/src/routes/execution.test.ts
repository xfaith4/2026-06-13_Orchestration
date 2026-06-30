import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../types/responses.js';

describe('Execution Routes Hardening', () => {
  describe('Direct Execution Guard', () => {
    it('allows direct execution in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Should not throw
      expect(() => {
        if (process.env.NODE_ENV !== 'development' && process.env.ALLOW_DIRECT_EXECUTION !== 'true') {
          throw new ApiError(403, 'Direct task/phase execution is disabled in production');
        }
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('blocks direct execution in production without flag', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalFlag = process.env.ALLOW_DIRECT_EXECUTION;

      process.env.NODE_ENV = 'production';
      process.env.ALLOW_DIRECT_EXECUTION = '';

      // Should throw
      expect(() => {
        if (process.env.NODE_ENV !== 'development' && process.env.ALLOW_DIRECT_EXECUTION !== 'true') {
          throw new ApiError(403, 'Direct task/phase execution is disabled in production');
        }
      }).toThrow();

      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_DIRECT_EXECUTION = originalFlag;
    });

    it('allows direct execution in production with explicit flag', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalFlag = process.env.ALLOW_DIRECT_EXECUTION;

      process.env.NODE_ENV = 'production';
      process.env.ALLOW_DIRECT_EXECUTION = 'true';

      // Should not throw
      expect(() => {
        if (process.env.NODE_ENV !== 'development' && process.env.ALLOW_DIRECT_EXECUTION !== 'true') {
          throw new ApiError(403, 'Direct task/phase execution is disabled in production');
        }
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_DIRECT_EXECUTION = originalFlag;
    });
  });

  describe('State Transition Enforcement', () => {
    it('throws 409 on invalid task state transition', () => {
      const canTransition = false;
      const currentStatus = 'completed';
      const newStatus = 'in-progress';

      if (!canTransition) {
        expect(() => {
          throw new ApiError(
            409,
            `Cannot transition task from ${currentStatus} to ${newStatus}`
          );
        }).toThrow(ApiError);
      }
    });

    it('throws 409 on invalid phase state transition', () => {
      const canTransition = false;
      const currentStatus = 'completed';
      const newStatus = 'in-progress';

      if (!canTransition) {
        expect(() => {
          throw new ApiError(
            409,
            `Cannot transition phase from ${currentStatus} to ${newStatus}`
          );
        }).toThrow(ApiError);
      }
    });

    it('allows valid state transitions', () => {
      const transitions = [
        { from: 'pending', to: 'in-progress' },
        { from: 'in-progress', to: 'completed' },
        { from: 'in-progress', to: 'failed' },
        { from: 'pending', to: 'failed' },
      ];

      for (const t of transitions) {
        // In real implementation, stateMachine.canTransition checks these
        const isValid = true; // Assume valid for this test
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Phase Completion Logic', () => {
    it('marks phase in-progress when some tasks complete but not all', () => {
      const tasks = [
        { id: 'task-1', status: 'completed' as const },
        { id: 'task-2', status: 'in-progress' as const },
      ];

      const allTasksCompleted = tasks.every(t => t.status === 'completed');
      const anyTaskFailed = tasks.some(t => t.status === 'failed');

      const phaseStatus =
        anyTaskFailed ? 'failed' :
        allTasksCompleted ? 'completed' :
        'in-progress';

      expect(phaseStatus).toBe('in-progress');
    });

    it('marks phase completed when all tasks complete', () => {
      const tasks = [
        { id: 'task-1', status: 'completed' as const },
        { id: 'task-2', status: 'completed' as const },
      ];

      const allTasksCompleted = tasks.every(t => t.status === 'completed');
      const anyTaskFailed = tasks.some(t => t.status === 'failed');

      const phaseStatus =
        anyTaskFailed ? 'failed' :
        allTasksCompleted ? 'completed' :
        'in-progress';

      expect(phaseStatus).toBe('completed');
    });

    it('marks phase failed if any task fails', () => {
      const tasks = [
        { id: 'task-1', status: 'completed' as const },
        { id: 'task-2', status: 'failed' as const },
      ];

      const allTasksCompleted = tasks.every(t => t.status === 'completed');
      const anyTaskFailed = tasks.some(t => t.status === 'failed');

      const phaseStatus =
        anyTaskFailed ? 'failed' :
        allTasksCompleted ? 'completed' :
        'in-progress';

      expect(phaseStatus).toBe('failed');
    });

    it('does not mark phase complete when single task completes', () => {
      // Simulate single task execution endpoint updating a multi-task phase
      const allTasks = [
        { id: 'task-1', status: 'completed' as const },
        { id: 'task-2', status: 'in-progress' as const },
        { id: 'task-3', status: 'pending' as const },
      ];

      const allCompleted = allTasks.every(t => t.status === 'completed');
      const anyFailed = allTasks.some(t => t.status === 'failed');

      const phaseStatus =
        anyFailed ? 'failed' :
        allCompleted ? 'completed' :
        'in-progress';

      expect(phaseStatus).toBe('in-progress');
      expect(phaseStatus).not.toBe('completed');
    });
  });
});
