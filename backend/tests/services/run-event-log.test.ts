import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { RunEventLog } from '../../src/services/run-event-log.js';

describe('RunEventLog', () => {
  let dir: string;

  beforeEach(async () => {
    dir = path.join(os.tmpdir(), `uaitb-events-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
    await fs.mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('appends events and reads them back in order', async () => {
    const log = new RunEventLog(dir);
    await log.emit('run-1', 'run_started', { msg: 'go' });
    await log.emit('run-1', 'agent_started', { agent: 'Engineer', step: 't1' });
    await log.emit('run-1', 'run_completed', { data: { status: 'completed' } });

    const events = await log.read('run-1');
    expect(events.map(e => e.type)).toEqual(['run_started', 'agent_started', 'run_completed']);
    expect(events[0].runId).toBe('run-1');
    expect(events[0].ts).toBeTruthy();
    expect(events[1].agent).toBe('Engineer');
  });

  it('applies default severity levels per event type', async () => {
    const log = new RunEventLog(dir);
    await log.emit('run-2', 'run_failed', { msg: 'boom' });
    await log.emit('run-2', 'agent_blocked', {});
    const [failed, blocked] = await log.read('run-2');
    expect(failed.level).toBe('error');
    expect(blocked.level).toBe('warn');
  });

  it('returns [] for an unknown run', async () => {
    const log = new RunEventLog(dir);
    expect(await log.read('nope')).toEqual([]);
  });

  it('isolates streams per run', async () => {
    const log = new RunEventLog(dir);
    await log.emit('a', 'run_started', {});
    await log.emit('b', 'run_started', {});
    expect((await log.read('a')).length).toBe(1);
    expect((await log.read('b')).length).toBe(1);
  });
});
