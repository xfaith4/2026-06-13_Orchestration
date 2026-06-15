import { DesignPlan, Roadmap, Phase, Task } from '@unifiedaitoolbox/shared';

export class RoadmapGenerator {
  generateFromDesignPlan(designPlan: DesignPlan, applicationId: string): Omit<Roadmap, 'id' | 'createdAt' | 'updatedAt'> {
    if (designPlan.status !== 'approved') {
      throw new Error('Design plan must be approved before generating roadmap');
    }

    const phases = this.generatePhases(designPlan);
    const title = `Implementation Roadmap: ${designPlan.applicationId}`;
    const description = this.generateDescription(designPlan);
    const estimatedDuration = this.estimateDuration(phases);

    return {
      applicationId,
      designPlanId: designPlan.id,
      title,
      description,
      phases,
      estimatedDuration,
      status: 'draft',
    };
  }

  private generatePhases(designPlan: DesignPlan): Phase[] {
    const phases: Phase[] = [];

    // Phase 0: Foundation Setup
    phases.push({
      id: `phase-0`,
      number: 0,
      name: 'Foundation & Infrastructure Setup',
      goal: 'Establish core infrastructure, database, and deployment pipeline',
      tasks: this.generateFoundationTasks(),
      startDate: undefined,
      endDate: undefined,
      estimatedHours: 40,
      dependencies: [],
    });

    // Phase 1: Core Components
    phases.push({
      id: `phase-1`,
      number: 1,
      name: 'Core Component Implementation',
      goal: 'Implement API Gateway, Persistence Layer, and Validation Service',
      tasks: this.generateCoreTasks(),
      startDate: undefined,
      endDate: undefined,
      estimatedHours: 80,
      dependencies: ['phase-0'],
    });

    // Phase 2: Feature Components
    const featureComponents = designPlan.components.filter(
      c => !['API Gateway', 'Persistence Layer', 'Validation Service'].includes(c.name)
    );

    if (featureComponents.length > 0) {
      phases.push({
        id: `phase-2`,
        number: 2,
        name: 'Feature Components',
        goal: `Implement ${featureComponents.map(c => c.name).join(', ')}`,
        tasks: this.generateFeatureTasks(featureComponents),
        startDate: undefined,
        endDate: undefined,
        estimatedHours: featureComponents.length * 40,
        dependencies: ['phase-1'],
      });
    }

    // Phase 3: Integration & Testing
    phases.push({
      id: `phase-3`,
      number: 3,
      name: 'Integration & Testing',
      goal: 'End-to-end testing, performance optimization, and integration validation',
      tasks: this.generateIntegrationTasks(),
      startDate: undefined,
      endDate: undefined,
      estimatedHours: 60,
      dependencies: featureComponents.length > 0 ? ['phase-2'] : ['phase-1'],
    });

    // Phase 4: Deployment & Documentation
    phases.push({
      id: `phase-4`,
      number: 4,
      name: 'Deployment & Documentation',
      goal: 'Production deployment, monitoring setup, and documentation',
      tasks: this.generateDeploymentTasks(),
      startDate: undefined,
      endDate: undefined,
      estimatedHours: 40,
      dependencies: ['phase-3'],
    });

    return phases;
  }

  private generateFoundationTasks(): Task[] {
    return [
      {
        id: 'task-0-1',
        name: 'Set up project repository and CI/CD pipeline',
        description: 'Initialize Git, configure GitHub Actions or similar',
        status: 'pending',
        estimatedHours: 8,
        dependencies: [],
      },
      {
        id: 'task-0-2',
        name: 'Configure database and schema',
        description: 'Set up primary data store, migrations, and indices',
        status: 'pending',
        estimatedHours: 16,
        dependencies: [],
      },
      {
        id: 'task-0-3',
        name: 'Establish logging and monitoring',
        description: 'Configure structured logging, tracing, and alerting',
        status: 'pending',
        estimatedHours: 8,
        dependencies: [],
      },
      {
        id: 'task-0-4',
        name: 'Create deployment infrastructure',
        description: 'Docker, Kubernetes, or cloud platform setup',
        status: 'pending',
        estimatedHours: 8,
        dependencies: ['task-0-1'],
      },
    ];
  }

  private generateCoreTasks(): Task[] {
    return [
      {
        id: 'task-1-1',
        name: 'Implement API Gateway',
        description: 'HTTP request handling, routing, and middleware',
        status: 'pending',
        estimatedHours: 20,
        dependencies: ['task-0-1'],
      },
      {
        id: 'task-1-2',
        name: 'Implement Persistence Layer',
        description: 'CRUD operations, transactions, and query builder',
        status: 'pending',
        estimatedHours: 24,
        dependencies: ['task-0-2'],
      },
      {
        id: 'task-1-3',
        name: 'Implement Validation Service',
        description: 'JSON schema validation, type checking, error reporting',
        status: 'pending',
        estimatedHours: 16,
        dependencies: ['task-0-1'],
      },
      {
        id: 'task-1-4',
        name: 'Implement error handling and recovery',
        description: 'Circuit breakers, retries, graceful degradation',
        status: 'pending',
        estimatedHours: 20,
        dependencies: ['task-1-1', 'task-1-2', 'task-1-3'],
      },
    ];
  }

  private generateFeatureTasks(components: DesignPlan['components']): Task[] {
    const tasks: Task[] = [];

    components.forEach((component, idx) => {
      const taskId = `task-2-${idx + 1}`;
      tasks.push({
        id: taskId,
        name: `Implement ${component.name}`,
        description: `${component.description}. Responsibility: ${component.responsibility}`,
        status: 'pending',
        estimatedHours: 40,
        dependencies: ['task-1-4'], // Depends on core components
      });
    });

    return tasks;
  }

  private generateIntegrationTasks(): Task[] {
    return [
      {
        id: 'task-3-1',
        name: 'End-to-end integration testing',
        description: 'Test complete workflows across all components',
        status: 'pending',
        estimatedHours: 20,
        dependencies: [],
      },
      {
        id: 'task-3-2',
        name: 'Performance testing and optimization',
        description: 'Load testing, bottleneck identification, optimization',
        status: 'pending',
        estimatedHours: 24,
        dependencies: ['task-3-1'],
      },
      {
        id: 'task-3-3',
        name: 'Security review and hardening',
        description: 'Vulnerability scanning, dependency audit, secure defaults',
        status: 'pending',
        estimatedHours: 16,
        dependencies: ['task-3-1'],
      },
    ];
  }

  private generateDeploymentTasks(): Task[] {
    return [
      {
        id: 'task-4-1',
        name: 'Set up production monitoring',
        description: 'Metrics, dashboards, alerting, and on-call procedures',
        status: 'pending',
        estimatedHours: 16,
        dependencies: ['task-3-2', 'task-3-3'],
      },
      {
        id: 'task-4-2',
        name: 'Deploy to production',
        description: 'Blue-green deployment, rollback procedures, validation',
        status: 'pending',
        estimatedHours: 12,
        dependencies: ['task-4-1'],
      },
      {
        id: 'task-4-3',
        name: 'Create documentation and runbooks',
        description: 'API docs, architecture guide, operational procedures',
        status: 'pending',
        estimatedHours: 12,
        dependencies: ['task-4-1'],
      },
    ];
  }

  private generateDescription(designPlan: DesignPlan): string {
    const componentCount = designPlan.components.length;
    return `This roadmap breaks down the implementation of the design plan into ${5} phases. ` +
           `It covers foundation setup, implementation of ${componentCount} components, ` +
           `integration testing, performance optimization, and production deployment. ` +
           `The roadmap should be executed sequentially, with each phase depending on successful ` +
           `completion of previous phases.`;
  }

  private estimateDuration(phases: Phase[]): string {
    const totalHours = phases.reduce((sum, p) => sum + (p.estimatedHours || 0), 0);
    const weeks = Math.ceil(totalHours / 40); // Assuming 40 hrs/week
    const months = Math.ceil(weeks / 4);

    return `${totalHours} hours (~${weeks} weeks, ~${months} months)`;
  }
}
