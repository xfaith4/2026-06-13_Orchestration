import { RunStatus, PhaseStatus, TaskStatus, StateTransitionEvent } from '@unifiedaitoolbox/shared';

interface StateTransition {
  from: string;
  to: string;
}

interface StateTransitions {
  [key: string]: string[];
}

export class RunStateMachine {
  private runStateTransitions: StateTransitions = {
    draft: ['pending', 'draft'],
    pending: ['running', 'draft'],
    running: ['paused', 'completed', 'failed'],
    paused: ['running', 'failed'],
    completed: [],
    failed: [],
  };

  private phaseStateTransitions: StateTransitions = {
    pending: ['in-progress', 'failed'],
    'in-progress': ['completed', 'failed'],
    completed: [],
    failed: [],
  };

  private taskStateTransitions: StateTransitions = {
    pending: ['assigned', 'blocked'],
    assigned: ['in-progress', 'blocked'],
    'in-progress': ['completed', 'failed', 'blocked'],
    completed: [],
    failed: [],
    blocked: ['pending', 'assigned'],
  };

  private transitions: StateTransitionEvent[] = [];
  private onTransition?: (event: StateTransitionEvent) => void;

  constructor(onTransition?: (event: StateTransitionEvent) => void) {
    this.onTransition = onTransition;
  }

  // Run state transitions
  canTransitionRun(fromStatus: RunStatus, toStatus: RunStatus): boolean {
    const allowed = this.runStateTransitions[fromStatus] || [];
    return allowed.includes(toStatus);
  }

  transitionRun(
    runId: string,
    fromStatus: RunStatus,
    toStatus: RunStatus,
    reason?: string,
    performedBy?: string
  ): StateTransitionEvent {
    if (!this.canTransitionRun(fromStatus, toStatus)) {
      throw new Error(
        `Invalid run state transition: ${fromStatus} → ${toStatus}`
      );
    }

    const event: StateTransitionEvent = {
      id: `${runId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      entityType: 'run',
      entityId: runId,
      fromState: fromStatus,
      toState: toStatus,
      reason,
      performedBy,
    };

    this.transitions.push(event);

    // Notify listener of transition
    if (this.onTransition) {
      this.onTransition(event);
    }

    return event;
  }

  // Phase state transitions
  canTransitionPhase(fromStatus: PhaseStatus, toStatus: PhaseStatus): boolean {
    const allowed = this.phaseStateTransitions[fromStatus] || [];
    return allowed.includes(toStatus);
  }

  transitionPhase(
    runId: string,
    phaseId: string,
    fromStatus: PhaseStatus,
    toStatus: PhaseStatus,
    reason?: string,
    performedBy?: string
  ): StateTransitionEvent {
    if (!this.canTransitionPhase(fromStatus, toStatus)) {
      throw new Error(
        `Invalid phase state transition: ${fromStatus} → ${toStatus}`
      );
    }

    const event: StateTransitionEvent = {
      id: `${phaseId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      entityType: 'phase',
      entityId: phaseId,
      fromState: fromStatus,
      toState: toStatus,
      reason,
      performedBy,
    };

    this.transitions.push(event);

    // Notify listener of transition
    if (this.onTransition) {
      this.onTransition(event);
    }

    return event;
  }

  // Task state transitions
  canTransitionTask(fromStatus: TaskStatus, toStatus: TaskStatus): boolean {
    const allowed = this.taskStateTransitions[fromStatus] || [];
    return allowed.includes(toStatus);
  }

  transitionTask(
    runId: string,
    phaseId: string,
    taskId: string,
    fromStatus: TaskStatus,
    toStatus: TaskStatus,
    reason?: string,
    performedBy?: string
  ): StateTransitionEvent {
    if (!this.canTransitionTask(fromStatus, toStatus)) {
      throw new Error(
        `Invalid task state transition: ${fromStatus} → ${toStatus}`
      );
    }

    const event: StateTransitionEvent = {
      id: `${taskId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      entityType: 'task',
      entityId: taskId,
      fromState: fromStatus,
      toState: toStatus,
      reason,
      performedBy,
    };

    this.transitions.push(event);

    // Notify listener of transition
    if (this.onTransition) {
      this.onTransition(event);
    }

    return event;
  }

  // Get transition history
  getTransitionHistory(): StateTransitionEvent[] {
    return [...this.transitions];
  }

  getTransitionHistoryForRun(runId: string): StateTransitionEvent[] {
    return this.transitions.filter(t => {
      // Filter by run ID directly or by transitions that start with this run ID
      return t.entityId === runId || t.id.startsWith(runId);
    });
  }

  getValidTransitions(
    entityType: 'run' | 'phase' | 'task',
    currentStatus: string
  ): string[] {
    const transitions =
      entityType === 'run'
        ? this.runStateTransitions
        : entityType === 'phase'
          ? this.phaseStateTransitions
          : this.taskStateTransitions;

    return transitions[currentStatus] || [];
  }

  // Get all valid states
  getValidRunStates(): RunStatus[] {
    return Object.keys(this.runStateTransitions) as RunStatus[];
  }

  getValidPhaseStates(): PhaseStatus[] {
    return Object.keys(this.phaseStateTransitions) as PhaseStatus[];
  }

  getValidTaskStates(): TaskStatus[] {
    return Object.keys(this.taskStateTransitions) as TaskStatus[];
  }

  // Check if state is terminal
  isTerminalState(
    entityType: 'run' | 'phase' | 'task',
    status: string
  ): boolean {
    const transitions =
      entityType === 'run'
        ? this.runStateTransitions
        : entityType === 'phase'
          ? this.phaseStateTransitions
          : this.taskStateTransitions;

    const allowedTransitions = transitions[status] || [];
    return allowedTransitions.length === 0;
  }
}
