import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RunStateMachine } from '@fuhrhaus/orchestration-core';

describe('RunStateMachine', () => {
  let stateMachine: RunStateMachine;
  let transitionListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    transitionListener = vi.fn();
    stateMachine = new RunStateMachine(transitionListener);
  });

  describe('Run state transitions', () => {
    it('should allow valid run transition: draft → pending', () => {
      expect(stateMachine.canTransitionRun('draft', 'pending')).toBe(true);
    });

    it('should allow valid run transition: pending → running', () => {
      expect(stateMachine.canTransitionRun('pending', 'running')).toBe(true);
    });

    it('should allow valid run transition: running → completed', () => {
      expect(stateMachine.canTransitionRun('running', 'completed')).toBe(true);
    });

    it('should allow valid run transition: running → paused', () => {
      expect(stateMachine.canTransitionRun('running', 'paused')).toBe(true);
    });

    it('should allow valid run transition: paused → running', () => {
      expect(stateMachine.canTransitionRun('paused', 'running')).toBe(true);
    });

    it('should allow valid run transition: running → failed', () => {
      expect(stateMachine.canTransitionRun('running', 'failed')).toBe(true);
    });

    it('should reject invalid run transition: completed → running', () => {
      expect(stateMachine.canTransitionRun('completed', 'running')).toBe(false);
    });

    it('should reject invalid run transition: failed → running', () => {
      expect(stateMachine.canTransitionRun('failed', 'running')).toBe(false);
    });

    it('should throw on invalid transition attempt', () => {
      expect(() => {
        stateMachine.transitionRun('run-1', 'completed', 'running');
      }).toThrow('Invalid run state transition: completed → running');
    });

    it('should notify listener of state transition', () => {
      const event = stateMachine.transitionRun(
        'run-1',
        'draft',
        'pending',
        'User initiated',
        'user-123'
      );

      expect(event.entityType).toBe('run');
      expect(event.entityId).toBe('run-1');
      expect(event.fromState).toBe('draft');
      expect(event.toState).toBe('pending');
      expect(event.reason).toBe('User initiated');
      expect(event.performedBy).toBe('user-123');
      expect(transitionListener).toHaveBeenCalledWith(event);
    });

    it('should return valid transitions for current state', () => {
      const transitions = stateMachine.getValidTransitions('run', 'running');
      expect(transitions).toContain('paused');
      expect(transitions).toContain('completed');
      expect(transitions).toContain('failed');
    });
  });

  describe('Phase state transitions', () => {
    it('should allow valid phase transition: pending → in-progress', () => {
      expect(stateMachine.canTransitionPhase('pending', 'in-progress')).toBe(true);
    });

    it('should allow valid phase transition: in-progress → completed', () => {
      expect(
        stateMachine.canTransitionPhase('in-progress', 'completed')
      ).toBe(true);
    });

    it('should allow valid phase transition: in-progress → failed', () => {
      expect(stateMachine.canTransitionPhase('in-progress', 'failed')).toBe(
        true
      );
    });

    it('should reject invalid phase transition: completed → in-progress', () => {
      expect(
        stateMachine.canTransitionPhase('completed', 'in-progress')
      ).toBe(false);
    });

    it('should throw on invalid phase transition attempt', () => {
      expect(() => {
        stateMachine.transitionPhase(
          'run-1',
          'phase-1',
          'completed',
          'pending'
        );
      }).toThrow('Invalid phase state transition: completed → pending');
    });

    it('should log phase state transition event', () => {
      const event = stateMachine.transitionPhase(
        'run-1',
        'phase-1',
        'pending',
        'in-progress',
        'Phase started'
      );

      expect(event.entityType).toBe('phase');
      expect(event.entityId).toBe('phase-1');
      expect(event.fromState).toBe('pending');
      expect(event.toState).toBe('in-progress');
    });
  });

  describe('Task state transitions', () => {
    it('should allow valid task transition: pending → assigned', () => {
      expect(stateMachine.canTransitionTask('pending', 'assigned')).toBe(true);
    });

    it('should allow valid task transition: assigned → in-progress', () => {
      expect(
        stateMachine.canTransitionTask('assigned', 'in-progress')
      ).toBe(true);
    });

    it('should allow valid task transition: in-progress → completed', () => {
      expect(
        stateMachine.canTransitionTask('in-progress', 'completed')
      ).toBe(true);
    });

    it('should allow valid task transition: in-progress → failed', () => {
      expect(stateMachine.canTransitionTask('in-progress', 'failed')).toBe(
        true
      );
    });

    it('should allow valid task transition: blocked → pending', () => {
      expect(stateMachine.canTransitionTask('blocked', 'pending')).toBe(true);
    });

    it('should reject invalid task transition: completed → in-progress', () => {
      expect(
        stateMachine.canTransitionTask('completed', 'in-progress')
      ).toBe(false);
    });

    it('should throw on invalid task transition attempt', () => {
      expect(() => {
        stateMachine.transitionTask(
          'run-1',
          'phase-1',
          'task-1',
          'completed',
          'pending'
        );
      }).toThrow('Invalid task state transition: completed → pending');
    });

    it('should log task state transition event', () => {
      const event = stateMachine.transitionTask(
        'run-1',
        'phase-1',
        'task-1',
        'pending',
        'assigned',
        'Assigned to agent'
      );

      expect(event.entityType).toBe('task');
      expect(event.entityId).toBe('task-1');
      expect(event.fromState).toBe('pending');
      expect(event.toState).toBe('assigned');
    });
  });

  describe('Transition history', () => {
    it('should track all transitions', () => {
      stateMachine.transitionRun('run-1', 'draft', 'pending');
      stateMachine.transitionRun('run-1', 'pending', 'running');
      stateMachine.transitionPhase('run-1', 'phase-1', 'pending', 'in-progress');

      const history = stateMachine.getTransitionHistory();
      expect(history).toHaveLength(3);
      expect(history[0].toState).toBe('pending');
      expect(history[1].toState).toBe('running');
      expect(history[2].entityType).toBe('phase');
    });

    it('should filter transition history by run', () => {
      stateMachine.transitionRun('run-1', 'draft', 'pending');
      stateMachine.transitionRun('run-2', 'draft', 'pending');
      stateMachine.transitionPhase('run-1', 'phase-1', 'pending', 'in-progress');

      const history = stateMachine.getTransitionHistoryForRun('run-1');
      // Should have 2 transitions for run-1 (1 run transition + 1 phase transition)
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Valid states and transitions', () => {
    it('should return all valid run states', () => {
      const states = stateMachine.getValidRunStates();
      expect(states).toContain('draft');
      expect(states).toContain('pending');
      expect(states).toContain('running');
      expect(states).toContain('completed');
      expect(states).toContain('failed');
      expect(states).toContain('paused');
    });

    it('should return all valid phase states', () => {
      const states = stateMachine.getValidPhaseStates();
      expect(states).toContain('pending');
      expect(states).toContain('in-progress');
      expect(states).toContain('completed');
      expect(states).toContain('failed');
    });

    it('should return all valid task states', () => {
      const states = stateMachine.getValidTaskStates();
      expect(states).toContain('pending');
      expect(states).toContain('assigned');
      expect(states).toContain('in-progress');
      expect(states).toContain('completed');
      expect(states).toContain('failed');
      expect(states).toContain('blocked');
    });
  });

  describe('Terminal states', () => {
    it('should identify completed as terminal run state', () => {
      expect(stateMachine.isTerminalState('run', 'completed')).toBe(true);
    });

    it('should identify failed as terminal run state', () => {
      expect(stateMachine.isTerminalState('run', 'failed')).toBe(true);
    });

    it('should not identify running as terminal run state', () => {
      expect(stateMachine.isTerminalState('run', 'running')).toBe(false);
    });

    it('should identify completed as terminal phase state', () => {
      expect(stateMachine.isTerminalState('phase', 'completed')).toBe(true);
    });

    it('should identify failed as terminal phase state', () => {
      expect(stateMachine.isTerminalState('phase', 'failed')).toBe(true);
    });

    it('should identify completed as terminal task state', () => {
      expect(stateMachine.isTerminalState('task', 'completed')).toBe(true);
    });
  });
});
