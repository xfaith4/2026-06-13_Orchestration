import { DesignPlan, Roadmap, Phase, Task } from '@unifiedaitoolbox/shared';
import { LLMClient } from './llm-client.js';

const SYSTEM_PROMPT = `You are an expert software project manager and technical lead. Given an
approved design plan, generate a detailed implementation roadmap.

The roadmap must be a single JSON object matching this exact schema:
{
  "title": "string",
  "description": "string",
  "estimatedDuration": "string — e.g. '240 hours (~6 weeks)'",
  "phases": [
    {
      "id": "string — e.g. 'phase-0'",
      "number": 0,
      "name": "string",
      "goal": "string",
      "estimatedHours": 40,
      "dependencies": [],
      "tasks": [
        {
          "id": "string — e.g. 'task-0-1'",
          "name": "string",
          "description": "string — specific implementation detail",
          "status": "pending",
          "estimatedHours": 8,
          "dependencies": []
        }
      ]
    }
  ]
}

Rules:
- Produce 3-6 sequential phases that fully cover implementation from setup to deployment
- Each phase must have 3-6 concrete, specific tasks
- Task IDs must be unique across all phases (use 'task-{phaseNumber}-{taskNumber}' format)
- Phase dependencies reference phase IDs of prerequisite phases
- Task dependencies reference task IDs within the same or earlier phases
- estimatedHours should be realistic for a professional engineer
- Respond with ONLY the JSON object, no preamble or trailing text`;

export class RoadmapGenerator {
  async generateFromDesignPlan(
    designPlan: DesignPlan,
    applicationId: string
  ): Promise<Omit<Roadmap, 'id' | 'createdAt' | 'updatedAt'>> {
    if (designPlan.status !== 'approved') {
      throw new Error('Design plan must be approved before generating roadmap');
    }

    if (LLMClient.isAvailable()) {
      try {
        return await this.generateWithLLM(designPlan, applicationId);
      } catch (err) {
        console.warn('[RoadmapGenerator] LLM call failed, falling back to template:', err);
      }
    }
    return this.generateFromTemplate(designPlan, applicationId);
  }

  private async generateWithLLM(
    designPlan: DesignPlan,
    applicationId: string
  ): Promise<Omit<Roadmap, 'id' | 'createdAt' | 'updatedAt'>> {
    const client = new LLMClient();

    const userMessage = `Generate an implementation roadmap for this approved design plan:

Overview: ${designPlan.overview}

Architecture: ${designPlan.architecture}

Components to implement:
${designPlan.components
  .map(
    (c, i) =>
      `  ${i + 1}. ${c.name}: ${c.description}\n     Responsibility: ${c.responsibility}\n     Interfaces: ${c.interfaces.join(', ')}`
  )
  .join('\n')}

Key tradeoffs already decided:
${designPlan.tradeoffs.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`;

    const result = await client.call({
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 6000,
    });

    const jsonText = LLMClient.extractJSON(result.text);
    const parsed = JSON.parse(jsonText) as {
      title: string;
      description: string;
      estimatedDuration: string;
      phases: Phase[];
    };

    if (!parsed.title || !Array.isArray(parsed.phases) || parsed.phases.length === 0) {
      throw new Error('LLM response missing required roadmap fields');
    }

    // Ensure all task IDs are unique and status is 'pending'
    const normalizedPhases = parsed.phases.map(phase => ({
      ...phase,
      tasks: (phase.tasks || []).map(task => ({
        ...task,
        status: 'pending' as const,
        dependencies: task.dependencies || [],
      })),
      dependencies: phase.dependencies || [],
    }));

    console.log(
      `[RoadmapGenerator] LLM generated roadmap: ${normalizedPhases.length} phases, ` +
        `${normalizedPhases.reduce((s, p) => s + p.tasks.length, 0)} tasks, ` +
        `${result.inputTokens}→${result.outputTokens} tokens`
    );

    return {
      applicationId,
      designPlanId: designPlan.id,
      title: parsed.title,
      description: parsed.description,
      phases: normalizedPhases,
      estimatedDuration: parsed.estimatedDuration || this.estimateDuration(normalizedPhases),
      status: 'draft',
    };
  }

  private generateFromTemplate(
    designPlan: DesignPlan,
    applicationId: string
  ): Omit<Roadmap, 'id' | 'createdAt' | 'updatedAt'> {
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

    phases.push({
      id: 'phase-0',
      number: 0,
      name: 'Foundation & Infrastructure Setup',
      goal: 'Establish core infrastructure, database, and deployment pipeline',
      tasks: this.generateFoundationTasks(),
      startDate: undefined,
      endDate: undefined,
      estimatedHours: 40,
      dependencies: [],
    });

    phases.push({
      id: 'phase-1',
      number: 1,
      name: 'Core Component Implementation',
      goal: 'Implement API Gateway, Persistence Layer, and Validation Service',
      tasks: this.generateCoreTasks(),
      startDate: undefined,
      endDate: undefined,
      estimatedHours: 80,
      dependencies: ['phase-0'],
    });

    const featureComponents = designPlan.components.filter(
      c => !['API Gateway', 'Persistence Layer', 'Validation Service'].includes(c.name)
    );

    if (featureComponents.length > 0) {
      phases.push({
        id: 'phase-2',
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

    phases.push({
      id: `phase-${featureComponents.length > 0 ? 3 : 2}`,
      number: featureComponents.length > 0 ? 3 : 2,
      name: 'Integration & Testing',
      goal: 'End-to-end testing, performance optimization, and integration validation',
      tasks: this.generateIntegrationTasks(),
      startDate: undefined,
      endDate: undefined,
      estimatedHours: 60,
      dependencies: [featureComponents.length > 0 ? 'phase-2' : 'phase-1'],
    });

    const lastPhaseNum = featureComponents.length > 0 ? 4 : 3;
    const prevPhaseId = `phase-${lastPhaseNum - 1}`;
    phases.push({
      id: `phase-${lastPhaseNum}`,
      number: lastPhaseNum,
      name: 'Deployment & Documentation',
      goal: 'Production deployment, monitoring setup, and documentation',
      tasks: this.generateDeploymentTasks(),
      startDate: undefined,
      endDate: undefined,
      estimatedHours: 40,
      dependencies: [prevPhaseId],
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
    return components.map((component, idx) => ({
      id: `task-2-${idx + 1}`,
      name: `Implement ${component.name}`,
      description: `${component.description}. Responsibility: ${component.responsibility}`,
      status: 'pending' as const,
      estimatedHours: 40,
      dependencies: ['task-1-4'],
    }));
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
        dependencies: [],
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
    return (
      `This roadmap breaks down the implementation of the design plan into 5 phases. ` +
      `It covers foundation setup, implementation of ${componentCount} components, ` +
      `integration testing, performance optimization, and production deployment.`
    );
  }

  private estimateDuration(phases: Phase[]): string {
    const totalHours = phases.reduce((sum, p) => sum + (p.estimatedHours || 0), 0);
    const weeks = Math.ceil(totalHours / 40);
    const months = Math.ceil(weeks / 4);
    return `${totalHours} hours (~${weeks} weeks, ~${months} months)`;
  }
}
