#!/usr/bin/env node
/**
 * Chess Game Orchestration Runner
 * Generates design plan, roadmap, and starts execution
 */

import * as http from 'http';

const BACKEND_URL = 'http://localhost:3007';
const APP_ID = '2424cb4e-92e5-472e-aa18-1e20d15d1939'; // Chess game application

interface HttpResponse {
  statusCode: number;
  body: string;
}

function makeRequest(method: string, path: string, body?: unknown): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 500, body: data });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== Chess Game Orchestration Runner ===\n');

  try {
    // Step 1: Generate design plan
    console.log('[1/4] Generating design plan...');
    const designRes = await makeRequest('POST', `/api/design-plans/generate/${APP_ID}`);
    if (designRes.statusCode !== 201) {
      throw new Error(`Design plan failed: ${designRes.statusCode}\n${designRes.body}`);
    }
    const designData = JSON.parse(designRes.body);
    const designPlanId = designData.data.id;
    console.log(`✓ Design plan generated: ${designPlanId}\n`);

    // Step 2: Approve design plan
    console.log('[2/4] Approving design plan...');
    const approveDesignRes = await makeRequest('PATCH', `/api/design-plans/${designPlanId}/decision/approve`, {
      approver: 'chess-orchestrator',
    });
    if (approveDesignRes.statusCode !== 200) {
      throw new Error(`Design plan approval failed: ${approveDesignRes.statusCode}`);
    }
    console.log('✓ Design plan approved\n');

    // Step 3: Generate roadmap
    console.log('[3/4] Generating roadmap...');
    const roadmapRes = await makeRequest('POST', `/api/roadmaps/generate/${designPlanId}`);
    if (roadmapRes.statusCode !== 201) {
      throw new Error(`Roadmap failed: ${roadmapRes.statusCode}\n${roadmapRes.body}`);
    }
    const roadmapData = JSON.parse(roadmapRes.body);
    const roadmapId = roadmapData.data.id;
    console.log(`✓ Roadmap generated: ${roadmapId}\n`);

    // Step 4: Approve roadmap
    console.log('[4/4] Approving roadmap...');
    const approveRoadmapRes = await makeRequest('PATCH', `/api/roadmaps/${roadmapId}/approve`, {
      approver: 'chess-orchestrator',
    });
    if (approveRoadmapRes.statusCode !== 200) {
      throw new Error(`Roadmap approval failed: ${approveRoadmapRes.statusCode}`);
    }
    console.log('✓ Roadmap approved\n');

    // Step 5: Create and start run
    console.log('[5/5] Creating and starting run...');
    const runRes = await makeRequest('POST', `/api/runs/from-roadmap/${roadmapId}`);
    if (runRes.statusCode !== 201) {
      throw new Error(`Run creation failed: ${runRes.statusCode}`);
    }
    const runData = JSON.parse(runRes.body);
    const runId = runData.data.id;
    console.log(`✓ Run created: ${runId}`);

    const startRes = await makeRequest('PATCH', `/api/runs/${runId}/start`);
    if (startRes.statusCode !== 200) {
      throw new Error(`Run start failed: ${startRes.statusCode}`);
    }
    console.log('✓ Execution started\n');

    // Instructions
    console.log('=== CHESS GAME ORCHESTRATION IN PROGRESS ===\n');
    console.log(`Run ID: ${runId}`);
    console.log(`App ID: ${APP_ID}`);
    console.log(`Design Plan ID: ${designPlanId}`);
    console.log(`Roadmap ID: ${roadmapId}\n`);

    console.log('Monitor the run with:');
    console.log(`  curl http://localhost:3007/api/runs/${runId}`);
    console.log(`  cat data/run-events/${runId}.jsonl\n`);

    console.log('View generated files at:');
    console.log(`  output/projects/${runId}/\n`);

    console.log('Expected output:');
    console.log('  - Electron app with React frontend');
    console.log('  - 8x8 chessboard with pieces');
    console.log('  - Drag-and-drop or click-to-move');
    console.log('  - Full move validation');
    console.log('  - Checkmate/stalemate detection');
    console.log('  - Turn indicator and move history\n');
  } catch (error) {
    console.error('\n❌ ERROR:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
