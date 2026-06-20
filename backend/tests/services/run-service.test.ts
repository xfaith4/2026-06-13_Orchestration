import { describe, expect, it } from 'vitest';
import { Roadmap } from '@unifiedaitoolbox/shared';
import { RunService } from '../../src/services/run-service.js';

describe('RunService', () => {
  it('copies stack constraints from the roadmap into the new run', () => {
    const service = new RunService();
    const roadmap: Roadmap = {
      id: 'roadmap-1',
      applicationId: 'app-1',
      designPlanId: 'design-1',
      title: 'Execution roadmap',
      description: 'Create the execution plan',
      estimatedDuration: '2 weeks',
      status: 'approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phases: [
        {
          id: 'phase-1',
          number: 1,
          name: 'Foundation',
          goal: 'Create the base implementation',
          dependencies: [],
          tasks: [
            {
              id: 'task-1',
              name: 'Implement route',
              description: 'Create the route',
              status: 'pending',
              dependencies: [],
            },
          ],
        },
      ],
      stackConstraints: {
        language: 'TypeScript',
        runtime: 'Node.js >= 18',
        disallowedLanguages: ['Python'],
      },
    };

    const run = service.createRunFromRoadmap(roadmap, roadmap.applicationId);

    expect(run.status).toBe('draft');
    expect(run.stackConstraints).toEqual(roadmap.stackConstraints);
  });
});
