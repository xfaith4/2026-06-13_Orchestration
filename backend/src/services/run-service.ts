import { v4 as uuid } from 'uuid';
import { Run, Roadmap, ExecutionPhase, ExecutionTask, Phase, Task } from '@unifiedaitoolbox/shared';

export class RunService {
  createRunFromRoadmap(roadmap: Roadmap, applicationId: string): Omit<Run, 'id' | 'createdAt' | 'updatedAt'> {
    if (roadmap.status !== 'approved') {
      throw new Error(`Roadmap must be approved to create run, current status: ${roadmap.status}`);
    }

    const now = new Date().toISOString();
    const phases = roadmap.phases.map(phase => this.convertPhaseToExecutionPhase(phase));

    return {
      roadmapId: roadmap.id,
      applicationId,
      title: `Run: ${roadmap.title}`,
      description: roadmap.description,
      phases,
      status: 'draft',
    };
  }

  private convertPhaseToExecutionPhase(phase: Phase): ExecutionPhase {
    return {
      ...phase,
      status: 'pending',
      tasks: phase.tasks.map((task: Task) => ({
        ...task,
        status: 'pending' as const,
      })),
    };
  }

  startRun(run: Run): Run {
    if (run.status !== 'draft' && run.status !== 'pending' && run.status !== 'paused') {
      throw new Error(`Can only start draft, pending, or paused runs, current status: ${run.status}`);
    }

    return {
      ...run,
      status: 'running',
      startedAt: run.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  resumeRun(run: Run): Run {
    if (run.status !== 'paused') {
      throw new Error(`Can only resume paused runs, current status: ${run.status}`);
    }

    return {
      ...run,
      status: 'running',
      updatedAt: new Date().toISOString(),
    };
  }

  assignTask(run: Run, phaseId: string, taskId: string, assignedTo: string): Run {
    const phase = run.phases.find(p => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase ${phaseId} not found in run`);
    }

    const task = phase.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in phase ${phaseId}`);
    }

    if (task.status !== 'pending') {
      throw new Error(`Can only assign pending tasks, current status: ${task.status}`);
    }

    const updatedPhases = run.phases.map(p => {
      if (p.id === phaseId) {
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              return {
                ...t,
                status: 'assigned' as const,
                assignedTo,
                assignedAt: new Date().toISOString(),
              };
            }
            return t;
          }),
        };
      }
      return p;
    });

    return {
      ...run,
      phases: updatedPhases,
      updatedAt: new Date().toISOString(),
    };
  }

  startTask(run: Run, phaseId: string, taskId: string): Run {
    const phase = run.phases.find(p => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase ${phaseId} not found in run`);
    }

    const task = phase.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in phase ${phaseId}`);
    }

    if (task.status !== 'assigned' && task.status !== 'pending') {
      throw new Error(`Can only start pending or assigned tasks, current status: ${task.status}`);
    }

    const updatedPhases = run.phases.map(p => {
      if (p.id === phaseId) {
        return {
          ...p,
          status: p.status === 'pending' ? ('in-progress' as const) : p.status,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              return {
                ...t,
                status: 'in-progress' as const,
                startedAt: new Date().toISOString(),
              };
            }
            return t;
          }),
        };
      }
      return p;
    });

    return {
      ...run,
      phases: updatedPhases,
      status: run.status === 'pending' ? 'running' : run.status,
      updatedAt: new Date().toISOString(),
    };
  }

  completeTask(run: Run, phaseId: string, taskId: string, output?: unknown): Run {
    const phase = run.phases.find(p => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase ${phaseId} not found in run`);
    }

    const task = phase.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in phase ${phaseId}`);
    }

    if (task.status !== 'in-progress') {
      throw new Error(`Can only complete in-progress tasks, current status: ${task.status}`);
    }

    const now = new Date().toISOString();
    const updatedPhases = run.phases.map(p => {
      if (p.id === phaseId) {
        const updatedTasks = p.tasks.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              status: 'completed' as const,
              completedAt: now,
              output,
            };
          }
          return t;
        });

        // Check if all tasks in phase are completed
        const allCompleted = updatedTasks.every(t => t.status === 'completed');

        return {
          ...p,
          tasks: updatedTasks,
          status: allCompleted ? ('completed' as const) : p.status,
          completedAt: allCompleted ? now : p.completedAt,
        };
      }
      return p;
    });

    // Check if all phases are completed
    const allPhasesCompleted = updatedPhases.every(p => p.status === 'completed');

    return {
      ...run,
      phases: updatedPhases,
      status: allPhasesCompleted ? 'completed' : run.status,
      completedAt: allPhasesCompleted ? now : run.completedAt,
      updatedAt: now,
    };
  }

  failTask(run: Run, phaseId: string, taskId: string, error: string): Run {
    const phase = run.phases.find(p => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase ${phaseId} not found in run`);
    }

    const task = phase.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in phase ${phaseId}`);
    }

    const now = new Date().toISOString();
    const updatedPhases = run.phases.map(p => {
      if (p.id === phaseId) {
        return {
          ...p,
          status: 'failed' as const,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              return {
                ...t,
                status: 'failed' as const,
                completedAt: now,
                error,
              };
            }
            return t;
          }),
        };
      }
      return p;
    });

    return {
      ...run,
      phases: updatedPhases,
      status: 'failed',
      errorMessage: error,
      completedAt: now,
      updatedAt: now,
    };
  }

  pauseRun(run: Run): Run {
    if (run.status !== 'running') {
      throw new Error(`Can only pause running runs, current status: ${run.status}`);
    }

    return {
      ...run,
      status: 'paused',
      updatedAt: new Date().toISOString(),
    };
  }

  completeRun(run: Run): Run {
    if (run.status === 'completed' || run.status === 'failed') {
      return run;
    }

    return {
      ...run,
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  getTaskStatus(run: Run, phaseId: string, taskId: string): string {
    const phase = run.phases.find(p => p.id === phaseId);
    const task = phase?.tasks.find(t => t.id === taskId);
    return task?.status || 'unknown';
  }

  getPhaseProgress(run: Run, phaseId: string): { completed: number; total: number } {
    const phase = run.phases.find(p => p.id === phaseId);
    if (!phase) {
      return { completed: 0, total: 0 };
    }

    const completed = phase.tasks.filter(t => t.status === 'completed').length;
    const total = phase.tasks.length;

    return { completed, total };
  }

  getRunProgress(run: Run): { completed: number; total: number } {
    const allTasks = run.phases.flatMap(p => p.tasks);
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const total = allTasks.length;

    return { completed, total };
  }
}
