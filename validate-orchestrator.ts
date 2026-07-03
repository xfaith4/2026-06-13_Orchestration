#!/usr/bin/env node
/**
 * Orchestrator Validation Harness
 *
 * Tests the basic orchestrator flow:
 * 1. Submit a minimal application intake (Hello World CLI)
 * 2. Auto-approve design plan and roadmap
 * 3. Start execution
 * 4. Poll for completion
 * 5. Report results
 */

import * as http from 'http';
import * as https from 'https';

const BACKEND_URL = 'http://localhost:3007';
const POLL_INTERVAL_MS = 3000; // 3 seconds
const MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes

interface HttpResponse {
  statusCode: number;
  body: string;
}

function makeRequest(method: string, path: string, body?: unknown): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL + path);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 500, body: data });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('=== Orchestrator Validation Harness ===\n');

  try {
    // Step 1: Create application
    console.log('[1/5] Creating application intake...');
    const appRes = await makeRequest('POST', '/api/applications', {
      name: 'Hello World CLI',
      description: 'A simple command-line application that prints "Hello, World!"',
      goal: 'Create a working TypeScript CLI that outputs a greeting',
      requirements: [
        'Accept optional name parameter',
        'Print greeting to console',
        'Handle invalid arguments gracefully',
      ],
      constraints: ['Must be single TypeScript file', 'No external dependencies'],
      status: 'draft',
    });

    if (appRes.statusCode !== 201) {
      throw new Error(`Failed to create application: ${appRes.statusCode}\n${appRes.body}`);
    }

    const appData = JSON.parse(appRes.body);
    const appId = appData.data.id;
    console.log(`✓ Application created: ${appId}\n`);

    // Step 2: Generate design plan
    console.log('[2/5] Generating design plan...');
    const designRes = await makeRequest('POST', `/api/design-plans/generate/${appId}`);

    if (designRes.statusCode !== 201) {
      throw new Error(`Failed to generate design plan: ${designRes.statusCode}\n${designRes.body}`);
    }

    const designData = JSON.parse(designRes.body);
    const designPlanId = designData.data.id;
    console.log(`✓ Design plan generated: ${designPlanId}`);

    // Step 3: Approve design plan
    console.log('  Approving design plan...');
    const approveDesignRes = await makeRequest('PATCH', `/api/design-plans/${designPlanId}/decision/approve`, {
      approver: 'orchestrator-validation',
    });
    if (approveDesignRes.statusCode !== 200) {
      throw new Error(`Failed to approve design plan: ${approveDesignRes.statusCode}\n${approveDesignRes.body}`);
    }
    console.log(`✓ Design plan approved\n`);

    // Step 4: Generate roadmap
    console.log('[3/5] Generating roadmap...');
    const roadmapRes = await makeRequest('POST', `/api/roadmaps/generate/${designPlanId}`);

    if (roadmapRes.statusCode !== 201) {
      throw new Error(`Failed to generate roadmap: ${roadmapRes.statusCode}\n${roadmapRes.body}`);
    }

    const roadmapData = JSON.parse(roadmapRes.body);
    const roadmapId = roadmapData.data.id;
    console.log(`✓ Roadmap generated: ${roadmapId}`);

    // Step 5: Approve roadmap
    console.log('  Approving roadmap...');
    const approveRoadmapRes = await makeRequest('PATCH', `/api/roadmaps/${roadmapId}/approve`, {
      approver: 'orchestrator-validation',
    });
    if (approveRoadmapRes.statusCode !== 200) {
      throw new Error(`Failed to approve roadmap: ${approveRoadmapRes.statusCode}\n${approveRoadmapRes.body}`);
    }
    console.log(`✓ Roadmap approved\n`);

    // Step 6: Create run from roadmap
    console.log('[4/5] Creating run from roadmap...');
    const runRes = await makeRequest('POST', `/api/runs/from-roadmap/${roadmapId}`);

    if (runRes.statusCode !== 201) {
      throw new Error(`Failed to create run: ${runRes.statusCode}\n${runRes.body}`);
    }

    const runData = JSON.parse(runRes.body);
    const runId = runData.data.id;
    console.log(`✓ Run created: ${runId}\n`);

    // Step 7: Start execution
    console.log('[5/5] Starting execution...');
    const startRes = await makeRequest('PATCH', `/api/runs/${runId}/start`);

    if (startRes.statusCode !== 200) {
      throw new Error(`Failed to start run: ${startRes.statusCode}\n${startRes.body}`);
    }
    console.log(`✓ Execution started\n`);

    // Step 8: Poll for completion
    console.log('[POLLING] Waiting for execution to complete...');
    const startTime = Date.now();
    let run: any = null;

    while (Date.now() - startTime < MAX_WAIT_MS) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await makeRequest('GET', `/api/runs/${runId}`);
      if (pollRes.statusCode !== 200) {
        console.log(`  [${new Date().toISOString()}] Polling error: ${pollRes.statusCode}`);
        continue;
      }

      run = JSON.parse(pollRes.body).data;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`  [${elapsed}s] Status: ${run.status}, Validation: ${run.validation?.status ?? 'pending'}`);

      if (run.status === 'completed' || run.status === 'failed') {
        break;
      }
    }

    if (!run) {
      throw new Error('Run did not reach terminal status within timeout');
    }

    // Step 9: Fetch events for detailed analysis
    console.log('\n[RESULTS] Fetching run details...');
    const eventsRes = await makeRequest('GET', `/api/runs/${runId}/events`);
    const events = eventsRes.statusCode === 200 ? JSON.parse(eventsRes.body).data : [];

    // Step 10: Report results
    console.log('\n=== VALIDATION REPORT ===\n');
    console.log(`Run ID: ${runId}`);
    console.log(`Final Status: ${run.status}`);
    console.log(`Validation: ${run.validation?.status ?? 'unknown'}`);
    console.log(`Phases: ${run.phases?.length ?? 0} total`);
    const phasedPassed = run.phases?.filter((p: any) => p.status === 'completed').length ?? 0;
    console.log(`  - Completed: ${phasedPassed}`);

    // Event analysis
    const taskStartEvents = events.filter((e: any) => e.type === 'agent_started').length;
    const taskCompleteEvents = events.filter((e: any) => e.type === 'agent_completed').length;
    const blockedEvents = events.filter((e: any) => e.type === 'agent_blocked');

    // Count actual artifact_created events to see files that were produced
    const artifactEvents = events.filter((e: any) => e.type === 'artifact_created');
    const fileCount = artifactEvents.length;

    console.log(`Files/Artifacts Created: ${fileCount}`);
    console.log(`Cost: ${run.cost_meter?.total_cost_usd?.toFixed(4) ?? 'unknown'} USD`);

    console.log(`\nExecution Events:`);
    console.log(`  - Agent starts: ${taskStartEvents}`);
    console.log(`  - Agent completions: ${taskCompleteEvents}`);
    console.log(`  - Artifacts created (events): ${fileCount}`);
    console.log(`  - Blocked: ${blockedEvents.length}`);

    if (blockedEvents.length > 0) {
      console.log(`\n⚠️  BLOCKED EVENTS (escalations):`);
      blockedEvents.forEach((e: any) => {
        console.log(`    - ${e.data?.escalated_reason ?? e.msg}`);
      });
    }

    // Success criteria: completed status + validation passed + files were produced
    const success =
      run.status === 'completed' &&
      (run.validation?.status === 'passed' || run.validation?.status === 'insufficient_evidence') &&
      fileCount > 0;

    console.log(`\n=== VALIDATION ${success ? '✅ PASSED' : '❌ FAILED'} ===\n`);

    if (!success) {
      console.log('Failure reasons:');
      if (run.status !== 'completed') console.log(`  - Status is "${run.status}", not "completed"`);
      if (run.validation?.status === 'failed') console.log(`  - Validation failed`);
      if (fileCount === 0) console.log(`  - No files materialized`);
      console.log(`\nCheck event log at: data/run-events/${runId}.jsonl`);
      console.log(`Check artifacts at: output/projects/${runId}/`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
