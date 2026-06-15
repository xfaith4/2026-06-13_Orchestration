import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import request from 'supertest';
import { Express } from 'express';

describe('Run Pause/Resume', () => {
  let app: Express;
  let runId: string;

  beforeEach(async () => {
    app = await createApp();
    // Create a test run first
    const roadmapRes = await request(app)
      .post('/api/roadmaps')
      .send({
        applicationId: 'app-1',
        designPlanId: 'design-1',
        title: 'Test Roadmap',
        description: 'A test roadmap',
        phases: [],
        estimatedDuration: '2 weeks',
      });

    const roadmapId = roadmapRes.body.data?.id;

    // Create a run from the roadmap
    const runRes = await request(app)
      .post(`/api/runs/from-roadmap/${roadmapId}`)
      .send({});

    runId = runRes.body.data?.id;
  });

  it('should pause a running run', async () => {
    // Start the run
    await request(app)
      .patch(`/api/runs/${runId}/start`)
      .send({});

    // Pause the run
    const res = await request(app)
      .patch(`/api/runs/${runId}/pause`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data?.status).toBe('paused');
  });

  it('should resume a paused run', async () => {
    // Start the run
    await request(app)
      .patch(`/api/runs/${runId}/start`)
      .send({});

    // Pause the run
    await request(app)
      .patch(`/api/runs/${runId}/pause`)
      .send({});

    // Resume the run
    const res = await request(app)
      .patch(`/api/runs/${runId}/resume`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data?.status).toBe('running');
  });

  it('should not allow pause on draft run', async () => {
    const res = await request(app)
      .patch(`/api/runs/${runId}/pause`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should not allow resume on running run', async () => {
    // Start the run
    await request(app)
      .patch(`/api/runs/${runId}/start`)
      .send({});

    // Try to resume running run
    const res = await request(app)
      .patch(`/api/runs/${runId}/resume`)
      .send({});

    expect(res.status).toBe(400);
  });
});
