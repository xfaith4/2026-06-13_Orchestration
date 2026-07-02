import { Router, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { PersistenceService } from '../services/persistence.js';
import { ValidationService } from '../services/validation.js';
import { RunService } from '../services/run-service.js';
import { CostTracker } from '../services/cost-tracker.js';
import { CostMeter } from '../services/cost-meter.js';
import { ErrorLogger } from '../services/error-logger.js';
import { AgentRegistry } from '@fuhrhaus/orchestration-core';
import { PersistenceAgentStore } from '../services/persistence-agent-store.js';
import { PromptRegistry } from '../services/prompt-registry.js';
import { TaskExecutor } from '../services/task-executor.js';
import { PhaseExecutor } from '../services/phase-executor.js';
import { ArtifactStore } from '../services/artifact-store.js';
import { RunCompletion } from '../services/run-completion.js';
import { FailureClassifier } from '../services/failure-classifier.js';
import { RepairStrategist } from '../services/repair-strategist.js';
import { OutputParser } from '../services/output-parser.js';
import { Roadmap, Run, RunValidationOutcome } from '@unifiedaitoolbox/shared';
import { createResponse, ApiError } from '../types/responses.js';
import { createGenericCrudRoutes } from './generic-crud.js';
import { buildAgentAssignments, selectAgentForTask, filterAgentsByRoster } from '../services/agent-selector.js';
import { ProjectWriter, projectOutputDir, collectProducedFiles } from '../services/project-writer.js';
import { ProjectValidator, type ProjectValidationReport } from '../services/project-validator.js';
import { buildRepairTasks, buildDriftRepairTask } from '../services/repair-task-builder.js';
import { RunEventLog } from '../services/run-event-log.js';
import { transitionRunStatus, decideTerminalStatus, toValidationOutcome } from '../services/run-status.js';
import { captureBaseline } from '../services/baseline.js';
import { readProjectFiles, findContractModule, checkCoherence } from '../services/contract-spine.js';
import { loadJobTypes, buildAndValidate } from '../services/contract-compiler.js';
import { DEFAULT_REPAIR_POLICY, failureSignature, classifyFailureClass, repairGate, type EscalateAfter } from '../services/repair-policy.js';
import { checkPlanIntegrity, orderProducersFirst } from '../services/gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MaterializationResult {
  runId: string;
  tasksScanned: number;
  artifactsCreated: number;
  artifactsSkipped: number;
  errors: Array<{ taskId: string; message: string; filePath?: string }>;
  filePaths: string[];
}

const getArtifactsDirectory = (persistence: PersistenceService): string =>
  path.join(persistence.getDataDir(), 'artifacts');

const guessMimeType = (filePath: string): string => {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.ts':
    case '.tsx':
      return 'text/typescript';
    case '.js':
    case '.jsx':
      return 'text/javascript';
    case '.json':
      return 'application/json';
    case '.md':
      return 'text/markdown';
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.yml':
    case '.yaml':
      return 'application/yaml';
    case '.py':
      return 'text/x-python';
    case '.sh':
      return 'application/x-sh';
    default:
      return 'text/plain';
  }
};

const createArtifactKey = (taskId: string, name: string): string => `${taskId}::${name}`;

async function buildExistingArtifactMap(
  artifactStore: ArtifactStore,
  runId: string
): Promise<Map<string, true>> {
  const artifacts = await artifactStore.getArtifactsForRun(runId);
  return new Map(
    artifacts
      .filter(artifact => artifact.taskId)
      .map(artifact => [createArtifactKey(artifact.taskId!, artifact.name), true] as const)
  );
}

async function materializeTaskArtifacts(
  artifactStore: ArtifactStore,
  outputParser: OutputParser,
  existingArtifacts: Map<string, true>,
  params: {
    runId: string;
    phaseId: string;
    phaseName: string;
    taskId: string;
    output: unknown;
  }
): Promise<Omit<MaterializationResult, 'runId' | 'tasksScanned'>> {
  const fileArtifacts = outputParser.parseTaskOutput(params.output);
  const result = {
    artifactsCreated: 0,
    artifactsSkipped: 0,
    errors: [] as Array<{ taskId: string; message: string; filePath?: string }>,
    filePaths: [] as string[],
  };

  for (const artifact of fileArtifacts) {
    const key = createArtifactKey(params.taskId, artifact.filePath);
    if (existingArtifacts.has(key)) {
      result.artifactsSkipped++;
      continue;
    }

    try {
      await artifactStore.saveArtifact(artifact.content, {
        runId: params.runId,
        phaseId: params.phaseId,
        taskId: params.taskId,
        name: artifact.filePath,
        storageSubpath: artifact.filePath,
        type: 'code',
        mimeType: guessMimeType(artifact.filePath),
        tags: ['materialized-output', params.phaseName],
        metadata: {
          language: artifact.language,
          materializedFrom: 'task-output',
        },
      });
      existingArtifacts.set(key, true);
      result.artifactsCreated++;
      result.filePaths.push(artifact.filePath);
    } catch (error) {
      result.errors.push({
        taskId: params.taskId,
        filePath: artifact.filePath,
        message: error instanceof Error ? error.message : 'Artifact save failed',
      });
    }
  }

  return result;
}

async function materializeRunArtifacts(
  run: Run,
  artifactStore: ArtifactStore,
  outputParser: OutputParser,
  existingArtifacts?: Map<string, true>
): Promise<MaterializationResult> {
  const seenArtifacts = existingArtifacts || await buildExistingArtifactMap(artifactStore, run.id);
  const result: MaterializationResult = {
    runId: run.id,
    tasksScanned: 0,
    artifactsCreated: 0,
    artifactsSkipped: 0,
    errors: [],
    filePaths: [],
  };

  for (const phase of run.phases || []) {
    for (const task of phase.tasks || []) {
      if (!task.output) {
        continue;
      }

      result.tasksScanned++;
      const taskResult = await materializeTaskArtifacts(
        artifactStore,
        outputParser,
        seenArtifacts,
        {
          runId: run.id,
          phaseId: phase.id,
          phaseName: phase.name,
          taskId: task.id,
          output: task.output,
        }
      );

      result.artifactsCreated += taskResult.artifactsCreated;
      result.artifactsSkipped += taskResult.artifactsSkipped;
      result.errors.push(...taskResult.errors);
      result.filePaths.push(...taskResult.filePaths);
    }
  }

  return result;
}

async function refreshRunSummary(
  persistence: PersistenceService,
  artifactStore: ArtifactStore,
  runCompletion: RunCompletion,
  run: Run,
  fallbackStartTime?: Date
): Promise<void> {
  const completionTime = run.completedAt ? new Date(run.completedAt) : new Date();
  const startTime = run.startedAt
    ? new Date(run.startedAt)
    : fallbackStartTime || new Date(run.createdAt);
  const artifactSummary = await artifactStore.getRunArtifactSummary(run.id);
  const summary = runCompletion.generateSummary(run, startTime, completionTime, artifactSummary);
  const existing = await persistence.read('run-summaries', summary.id);

  if (existing) {
    await persistence.update('run-summaries', summary.id, summary);
  } else {
    await persistence.create('run-summaries', summary);
  }
}

// Resolve a run's produced-app directory, guarding against path escape.
function resolveOutputDir(runId: string): { repoRoot: string; dir: string } {
  const repoRoot = path.join(__dirname, '..', '..', '..');
  const dir = projectOutputDir(repoRoot, runId);
  const base = path.join(repoRoot, 'output', 'projects');
  if (dir !== base && !dir.startsWith(base + path.sep)) {
    throw new ApiError(400, 'Invalid run id');
  }
  return { repoRoot, dir };
}

async function executeRunAsync(runId: string, persistence: PersistenceService): Promise<void> {
  const agentsDir = path.join(__dirname, '..', '..', '..', 'agents');
  const promptsDir = path.join(__dirname, '..', '..', '..', 'Prompts');
  const artifactsDir = getArtifactsDirectory(persistence);

  const agentRegistry = new AgentRegistry(new PersistenceAgentStore(persistence), agentsDir);
  const promptRegistry = new PromptRegistry(persistence, promptsDir);
  await agentRegistry.initialize();
  await promptRegistry.initialize();

  const costTracker = new CostTracker();
  const costMeter = new CostMeter();
  const errorLogger = new ErrorLogger(persistence);
  const taskExecutor = new TaskExecutor(agentRegistry, promptRegistry);
  const phaseExecutor = new PhaseExecutor(taskExecutor, costTracker, errorLogger);
  const artifactStore = new ArtifactStore(persistence, { storagePath: artifactsDir });
  const runCompletion = new RunCompletion();
  const outputParser = new OutputParser();
  const existingArtifacts = await buildExistingArtifactMap(artifactStore, runId);

  // Project writer — writes extracted files to output/projects/{runId}/ so the
  // Validator can run real build tools against them.
  const repoRoot = path.join(__dirname, '..', '..', '..');
  const projectWriter = new ProjectWriter(projectOutputDir(repoRoot, runId));
  const eventLog = new RunEventLog(persistence.getDataDir());
  // Tracks the most recent phase validation so terminal status reflects quality, not just "ran".
  let lastValidationReport: ProjectValidationReport | null = null;
  let lastValidation: RunValidationOutcome | null = null;

  // Set to true after exhausting repair attempts on npm-install without fixing it.
  // Reset to false if a repair agent writes a new package.json, allowing one more retry.
  let npmGaveUp = false;

  const agents = agentRegistry.getAllAgents();
  if (!agents.length) {
    console.warn(`[auto-exec] No agents available for run ${runId} — execution skipped`);
    return;
  }

  let currentRun = await persistence.read<Run>('runs', runId);
  if (!currentRun) return;

  const runStartTime = new Date();
  await eventLog.emit(runId, 'run_started', {
    msg: currentRun.title,
    data: { phases: currentRun.phases.length, attempt_number: 1 },
  });

  for (const phase of currentRun.phases) {
    // Re-read in case run was paused/cancelled externally
    currentRun = (await persistence.read<Run>('runs', runId)) || currentRun;
    if (currentRun.status !== 'running') return;
    if (phase.status !== 'pending') continue;

    // Mark phase in-progress
    const inProgressRun: Run = {
      ...currentRun,
      phases: currentRun.phases.map(p =>
        p.id === phase.id
          ? { ...p, status: 'in-progress' as const, startedAt: new Date().toISOString() }
          : p
      ),
    };
    await persistence.update<Run>('runs', runId, inProgressRun);
    currentRun = inProgressRun;

    // Select the best-fit agent per task based on capabilities and task content
    // Phase 35: respect the contract-defined agent roster
    const agentAssignments = buildAgentAssignments(phase, agents, currentRun.contract?.agent_roster);

    // Phase 37: producer-then-reviewer ordering — a reviewer (Critic/Validator) never runs
    // before the producer output it reviews exists.
    const roleOfTask = (t: { id: string }) =>
      agents.find(a => a.id === agentAssignments[t.id])?.role;
    const orderedPhase = { ...phase, tasks: orderProducersFirst(phase.tasks, roleOfTask) };

    // Phase 34: inject the accumulating shared contract so this phase's workers import
    // shared types instead of redefining them (anti-drift).
    const priorFiles = await readProjectFiles(projectWriter.root);
    const contractModule = findContractModule(priorFiles);
    const sharedContract = contractModule ? contractModule.content : undefined;
    if (contractModule) {
      console.log(`[contract] Phase "${phase.name}": injecting shared contract from ${contractModule.path}`);
    }

    const phaseResult = await phaseExecutor.executePhase({
      phase: orderedPhase,
      agentAssignments,
      runId,
      stackConstraints: currentRun.stackConstraints,
      sharedContract,
      onTaskStart: async (taskId, agentId) => {
        await eventLog.emit(runId, 'agent_started', { agent: agentId, stage: phase.name, step: taskId });
      },
      onTaskComplete: async (taskId, output) => {
        await eventLog.emit(runId, 'agent_completed', {
          agent: agentAssignments[taskId],
          stage: phase.name,
          step: taskId,
          level: output.success ? 'info' : 'warn',
          data: { success: output.success, ...(output.error ? { error: output.error } : {}) },
        });
        if (!output.success || !output.output) {
          return;
        }

        // Store in artifact DB (internal record-keeping).
        const materialized = await materializeTaskArtifacts(
          artifactStore,
          outputParser,
          existingArtifacts,
          {
            runId,
            phaseId: phase.id,
            phaseName: phase.name,
            taskId,
            output: output.output,
          }
        );
        for (const error of materialized.errors) {
          console.warn(`[auto-exec] Artifact save error for ${taskId}: ${error.message}`);
        }

        // Also write extracted files to the live project directory so
        // the Validator can run tsc/vitest against real files on disk.
        const fileArtifacts = outputParser.parseTaskOutput(output.output);
        if (fileArtifacts.length > 0) {
          const writeResult = await projectWriter.write(fileArtifacts);
          console.log(
            `[auto-exec] Task ${taskId}: wrote ${writeResult.written.length} file(s) to project dir` +
            (writeResult.errors.length ? `, ${writeResult.errors.length} error(s)` : '')
          );
          for (const writtenPath of writeResult.written) {
            await eventLog.emit(runId, 'artifact_created', {
              agent: agentAssignments[taskId],
              stage: phase.name,
              step: taskId,
              data: { path: writtenPath, produced_by: agentAssignments[taskId] },
            });
          }
          for (const err of writeResult.errors) {
            console.warn(`[auto-exec] Write error — ${err.path}: ${err.message}`);
          }
        }
      },
    });

    // Re-read after execution (status may have changed externally)
    currentRun = (await persistence.read<Run>('runs', runId)) || currentRun;
    if (currentRun.status !== 'running') return;

    const phaseStatus = phaseResult.success ? ('completed' as const) : ('failed' as const);
    const now = new Date().toISOString();

    const afterPhaseRun: Run = {
      ...currentRun,
      phases: currentRun.phases.map(p => {
        if (p.id !== phase.id) return p;
        return {
          ...p,
          status: phaseStatus,
          completedAt: now,
          tasks: p.tasks.map(t => {
            const tr = phaseResult.taskResults.find(r => r.taskId === t.id);
            if (!tr) return t;
            return {
              ...t,
              status: tr.success ? ('completed' as const) : ('failed' as const),
              completedAt: now,
              output: tr.output,
              error: tr.error,
            };
          }),
        };
      }),
    };

    await persistence.update<Run>('runs', runId, afterPhaseRun);
    currentRun = afterPhaseRun;

    if (!phaseResult.success) {
      // The phase failed during task execution (before its own validation ran), so report
      // `not_run` rather than attaching a stale earlier-phase validation outcome.
      await transitionRunStatus(persistence, eventLog, runId, 'failed', {
        reason: phaseResult.error || `Phase "${phase.name}" failed`,
        validation: { status: 'not_run', summary: 'phase failed during task execution' },
      });
      return;
    }

    // Validate → Repair → Re-validate loop (Phase 36: signature-aware, planner-first escalation).
    let report: ProjectValidationReport | null = null;

    try {
      if (npmGaveUp) {
        // With a known-broken node_modules, tsc/vitest errors would be misleading.
        // Skip validation, but record `insufficient_evidence` so the terminal status reflects
        // "could not validate" rather than reusing a stale earlier-phase outcome.
        console.log(`[validator] Phase "${phase.name}" — npm-install gave up in prior phase, skipping validation`);
        lastValidation = {
          status: 'insufficient_evidence',
          summary: 'validation skipped — npm install was unrecoverable in a prior phase',
          checkedAt: new Date().toISOString(),
        };
        // eslint-disable-next-line no-continue
        continue;
      }

      await eventLog.emit(runId, 'validation_started', { stage: phase.name });
      report = await new ProjectValidator(projectWriter.root, runId).validate(['tsc', 'vitest']);
      console.log(`[validator] Phase "${phase.name}": ${report.summary}`);

      // Phase 33: capture a typed baseline BEFORE any repair, and never repair the
      // environment — a transient/IO failure (npm EPERM, file lock, network) is degraded
      // to `insufficient_evidence`, not chased as a code defect.
      const baseline = captureBaseline(runId, phase.id, report);
      await (persistence.create as (c: string, d: unknown) => Promise<unknown>)(
        'validation-baselines', baseline
      ).catch(() => { /* non-fatal */ });
      console.log(
        `[baseline] Phase "${phase.name}": ${baseline.status}, ${baseline.totalErrors} error(s)` +
        (baseline.transient ? ' — transient/environment, skipping repair' : '')
      );

      const repairPolicy = DEFAULT_REPAIR_POLICY;
      let attempt = 0;
      let escalateAfter: EscalateAfter | null = null;
      let currentSig = failureSignature(report);
      const sigCounts: Record<string, number> = currentSig ? { [currentSig]: 1 } : {};

      while (!baseline.transient && !report.passed) {
        const gate = repairGate({ attempt, currentSignature: currentSig, signatureCounts: sigCounts, policy: repairPolicy });
        if (!gate.proceed) {
          escalateAfter = gate.escalateAfter ?? null;
          break;
        }
        attempt++;
        console.log(`[repair] Phase "${phase.name}" generation ${attempt}/${repairPolicy.maxRepairGenerations}`);

        const repairTasks = await buildRepairTasks(report.results, projectWriter.root);
        if (!repairTasks.length) {
          console.warn('[repair] No repair tasks derived — stopping loop');
          break;
        }

        for (const repairTask of repairTasks) {
          // Phase 35: respect contract roster during repair too
          const rosterAgents = filterAgentsByRoster(agents, currentRun.contract?.agent_roster ?? []);
          const agent = selectAgentForTask(repairTask, rosterAgents);
          // Carry attempt history into the re-prompt so each generation is smarter than the last.
          const description = attempt > 1
            ? `${repairTask.description}\n\nThis is repair generation ${attempt}. A previous fix did NOT resolve these errors — change your approach; do not repeat the same edit.`
            : repairTask.description;
          console.log(`[repair] "${repairTask.name}" → ${agent.name}`);

          const result = await taskExecutor.executeTask({
            task: { id: repairTask.id, name: repairTask.name, description, status: 'pending', dependencies: [] },
            agentId: agent.id,
            runId,
            phaseId: phase.id,
          });

          if (result.success && result.output) {
            const repairedFiles = outputParser.parseTaskOutput(result.output);
            if (repairedFiles.length) {
              const wr = await projectWriter.write(repairedFiles);
              console.log(`[repair] Wrote ${wr.written.length} repaired file(s): ${wr.written.join(', ')}`);
            } else {
              console.warn(`[repair] Agent responded for ${repairTask.id} but extracted no files`);
            }
          } else {
            console.warn(`[repair] Task ${repairTask.id} failed: ${result.error}`);
          }
        }

        report = await new ProjectValidator(projectWriter.root, runId).validate(['tsc', 'vitest']);
        const newSig = failureSignature(report);
        console.log(`[repair] After generation ${attempt}: ${report.summary}`);

        if (report.passed) break;
        if (newSig === currentSig) {
          // Identical failure signature after a repair — no progress (no plan-delta). Stop.
          escalateAfter = 'no_plan_delta_detected';
          console.warn(`[repair] Phase "${phase.name}": identical failure signature after repair — no progress, stopping`);
          break;
        }
        sigCounts[newSig] = (sigCounts[newSig] ?? 0) + 1;
        currentSig = newSig;
      }

      // Planner-first escalation: when repair stops without passing, record + surface it by name.
      if (escalateAfter && !report.passed) {
        const failureClass = classifyFailureClass(report);
        await (persistence.create as (c: string, d: unknown) => Promise<unknown>)('repair-escalations', {
          runId,
          phaseId: phase.id,
          escalateAfter,
          escalationTarget: repairPolicy.escalationTarget,
          failureClass,
          generations: attempt,
          finalSignature: currentSig,
          totalErrors: report.totalErrors,
          createdAt: new Date().toISOString(),
        }).catch(() => { /* non-fatal */ });
        await eventLog.emit(runId, 'agent_blocked', {
          agent: 'Repair',
          stage: phase.name,
          level: 'warn',
          data: {
            severity: 'soft_blocker',
            code: escalateAfter,
            summary: `Repair stopped (${escalateAfter}) after ${attempt} generation(s); routing to ${repairPolicy.escalationTarget}`,
            needed_from: repairPolicy.escalationTarget,
            failure_class: failureClass,
          },
        });
        console.warn(`[repair] Phase "${phase.name}" escalated: ${escalateAfter} → ${repairPolicy.escalationTarget} (class: ${failureClass})`);
      } else if (report.passed) {
        const installResult = report.results.find(r => r.tool === 'npm-install');
        if (installResult?.passed) npmGaveUp = false;
      } else {
        console.warn(`[repair] Phase "${phase.name}" still has ${report.totalErrors} error(s) — continuing run`);
      }

      // If npm-install still failing after repair, flag it so later phases don't waste
      // generations on the same package.json.
      if (!report.passed) {
        const installFailed = report.results.find(r => r.tool === 'npm-install' && !r.passed);
        if (installFailed && attempt >= repairPolicy.maxRepairGenerations) {
          npmGaveUp = true;
        }
      }

      // Phase 34 follow-on: silent-drift repair. Consolidate duplicate type definitions that
      // compiled CLEAN but are incoherent (tsc won't flag them). Strictly safe: only on a green
      // build, bounded + no-progress guarded, fresh contract injected, and ROLLED BACK if the
      // consolidation regresses the build — so it can never turn a passing phase red.
      if (!baseline.transient && report.passed) {
        let files = await readProjectFiles(projectWriter.root);
        let coherence = checkCoherence(runId, files);
        if (coherence.status === 'drift') {
          const greenReport = report;
          const snapshot = files.map(f => ({ filePath: f.path, content: f.content }));
          let driftSig = coherence.drift.map(d => d.symbol).sort().join(',');
          let driftGen = 0;

          while (coherence.status === 'drift' && driftGen < 2) {
            driftGen++;
            console.log(
              `[drift] Phase "${phase.name}" gen ${driftGen}: consolidating ${coherence.drift.length} drifted symbol(s): ` +
              coherence.drift.map(d => d.symbol).join(', ')
            );
            const contractContent = coherence.contractModule
              ? files.find(f => f.path === coherence.contractModule)?.content
              : undefined;
            const driftTask = buildDriftRepairTask(coherence.drift, coherence.contractModule);
            // Phase 35: respect contract roster during drift repair too
            const driftRosterAgents = filterAgentsByRoster(agents, currentRun.contract?.agent_roster ?? []);
            const agent = selectAgentForTask(driftTask, driftRosterAgents);
            const driftResult = await taskExecutor.executeTask({
              task: { id: driftTask.id, name: driftTask.name, description: driftTask.description, status: 'pending', dependencies: [] },
              agentId: agent.id,
              runId,
              phaseId: phase.id,
              sharedContract: contractContent ?? sharedContract,
            });
            if (driftResult.success && driftResult.output) {
              const fixed = outputParser.parseTaskOutput(driftResult.output);
              if (fixed.length) {
                const wr = await projectWriter.write(fixed);
                console.log(`[drift] Wrote ${wr.written.length} consolidated file(s): ${wr.written.join(', ')}`);
              }
            }
            files = await readProjectFiles(projectWriter.root);
            const next = checkCoherence(runId, files);
            const nextSig = next.drift.map(d => d.symbol).sort().join(',');
            coherence = next;
            if (nextSig === driftSig) {
              console.warn(`[drift] Phase "${phase.name}": no progress on drift — stopping`);
              break;
            }
            driftSig = nextSig;
          }

          // Accept the consolidation only if the build is STILL green; otherwise roll back and
          // keep the (harmless, compiling) drift rather than regress a passing phase.
          const postReport = await new ProjectValidator(projectWriter.root, runId).validate(['tsc', 'vitest']);
          if (postReport.passed) {
            report = postReport;
            console.log(`[drift] Phase "${phase.name}": consolidation kept the build green`);
          } else {
            await projectWriter.write(snapshot);
            report = greenReport;
            console.warn(`[drift] Phase "${phase.name}": consolidation regressed the build — rolled back, drift left in place`);
          }
        }
      }

      if (report) {
        lastValidationReport = report;
        lastValidation = baseline.transient
          ? {
              status: 'insufficient_evidence',
              totalErrors: report.totalErrors,
              summary: 'Validation could not run reliably (transient/environment failure)',
              checkedAt: new Date().toISOString(),
            }
          : toValidationOutcome(report);
        await eventLog.emit(runId, 'validation_completed', {
          stage: phase.name,
          level:
            lastValidation.status === 'failed'
              ? 'error'
              : lastValidation.status === 'insufficient_evidence'
                ? 'warn'
                : 'info',
          data: {
            validation_status: lastValidation.status,
            baseline_status: baseline.status,
            totalErrors: report.totalErrors,
            summary: report.summary,
          },
        });
      }

      await (persistence.create as (c: string, d: unknown) => Promise<unknown>)(
        'validation-reports', { ...report, phaseId: phase.id }
      ).catch(() => { /* non-fatal */ });

    } catch (validationErr) {
      console.warn(
        `[validator] Phase "${phase.name}" validation skipped:`,
        validationErr instanceof Error ? validationErr.message : validationErr
      );
    }
  }

  // All phases done — apply the terminal-honesty guard (Phase 32) and generate summary.
  currentRun = (await persistence.read<Run>('runs', runId)) || currentRun;
  if (currentRun.status === 'running') {
    const allArtifacts = outputParser.parseTaskOutput(
      currentRun.phases.flatMap(p => p.tasks.map(t => t.output)).filter(Boolean)
    );

    // BUG FIX: Count ACTUAL files in output directory, not re-parsed task output.
    // The artifacts are written to disk via projectWriter; collect the real file count.
    const producedFiles = await collectProducedFiles(projectWriter.root);
    const validation = lastValidation ?? toValidationOutcome(lastValidationReport);
    const decision = decideTerminalStatus({ materializedCount: producedFiles.count, validation });

    // Write project manifest so the Validator knows what was produced.
    await projectWriter.writeManifest(allArtifacts, runId).catch(e =>
      console.warn('[auto-exec] Manifest write failed:', e)
    );

    // Phase 34: deterministic traceability gate — surface cross-worker interface drift by name.
    const traceability = checkCoherence(runId, await readProjectFiles(projectWriter.root));
    await (persistence.create as (c: string, d: unknown) => Promise<unknown>)(
      'traceability-reports', traceability
    ).catch(() => { /* non-fatal */ });
    if (traceability.status === 'drift') {
      console.warn(
        `[traceability] Run ${runId}: ${traceability.drift.length} duplicate-definition drift finding(s) — ` +
        traceability.drift.map(d => `${d.symbol} (${d.files.length} files)`).join(', ')
      );
    }

    const terminalRun = await transitionRunStatus(persistence, eventLog, runId, decision.status, {
      reason: decision.reason,
      validation,
      data: { driftCount: traceability.drift.length, contractModule: traceability.contractModule },
    });

    // Definitive cost report → evidence spine (reuses the spine; no parallel ledger).
    try {
      const summarySource = terminalRun || currentRun;
      const costReport = costMeter.report(summarySource, {
        successfulTasks: summarySource.phases.reduce(
          (n, p) => n + p.tasks.filter(t => t.status === 'completed').length,
          0
        ),
      });
      const ev = costMeter.toEvent(costReport);
      await eventLog.emit(runId, 'cost_report', { level: ev.level, msg: ev.msg, data: ev.data });
    } catch (costErr) {
      console.warn(`[auto-exec] Failed to emit cost report for run ${runId}:`, costErr);
    }

    // Generate and persist run summary
    try {
      await refreshRunSummary(persistence, artifactStore, runCompletion, terminalRun || currentRun, runStartTime);
      console.log(
        `[auto-exec] Run ${runId} ${decision.status}` +
          (decision.reason ? ` — ${decision.reason}` : '') +
          ` (validation: ${validation.status}) — summary saved`
      );
    } catch (summaryErr) {
      console.warn(`[auto-exec] Failed to generate summary for run ${runId}:`, summaryErr);
    }
  }
}

export const createRunRoutes = (
  persistence: PersistenceService,
  validation: ValidationService
) => {
  const router = Router();
  const runService = new RunService();
  const eventLog = new RunEventLog(persistence.getDataDir());

  // Canonical run event stream (Phase 32 evidence spine)
  router.get('/:id/events', async (req: Request, res: Response) => {
    const events = await eventLog.read(req.params.id);
    res.json(createResponse(events));
  });

  // Create run from approved roadmap
  router.post('/from-roadmap/:roadmapId', async (req: Request, res: Response) => {
    try {
      const { roadmapId } = req.params;

      // Fetch the roadmap
      const roadmap = await persistence.read<Roadmap>('roadmaps', roadmapId);
      if (!roadmap) {
        throw new ApiError(404, 'Roadmap not found');
      }

      if (roadmap.status !== 'approved') {
        throw new ApiError(400, `Roadmap must be approved to create run, current status: ${roadmap.status}`);
      }

      // Create run from roadmap
      const runData = runService.createRunFromRoadmap(roadmap, roadmap.applicationId);
      const run = await persistence.create<Run>('runs', runData);

      await eventLog.emit(run.id, 'run_created', {
        msg: run.title,
        data: { job_type: 'build_app', requested_objective: roadmap.title, roadmapId },
      });

      res.status(201).json(createResponse(run));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to create run',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Start run execution
  router.patch('/:id/start', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      // Phase 37: pre-run DAG integrity gate — refuse to start a structurally-broken plan
      // (unknown task dependencies or dependency cycles) before spending any model calls.
      const planCheck = checkPlanIntegrity(run.phases);
      if (!planCheck.ok) {
        throw new ApiError(422, `Run cannot start — plan integrity failed: ${planCheck.errors.join('; ')}`);
      }

      // Phase 35: harden the run into a complete, schema-valid contract before starting.
      // Refuse to start if the contract is incomplete or violates the job's stage policy.
      const jobType = run.contract?.job_type || 'build_new_app';
      let jobTypes;
      try {
        jobTypes = await loadJobTypes();
      } catch {
        throw new ApiError(500, 'job_types.json could not be loaded — cannot compile run contract');
      }
      const jobConfig = jobTypes[jobType];
      if (!jobConfig) {
        throw new ApiError(400, `Unknown job_type "${jobType}" — cannot compile run contract`);
      }
      const { contract, validation: contractCheck } = buildAndValidate(
        {
          jobType,
          goal: run.title || run.description || '',
          runId: run.id,
          metadata: { roadmapId: run.roadmapId },
        },
        jobConfig
      );
      if (!contractCheck.valid) {
        throw new ApiError(422, `Run cannot start — incomplete contract: ${contractCheck.errors.join('; ')}`);
      }
      console.log(
        `[contract] Run ${id}: compiled ${jobType} contract ` +
        `(roster ${contract.agent_roster.length}, stages ${contract.stages.join('/')})`
      );

      const updated = runService.startRun({ ...run, contract });
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));

      // Fire-and-forget: drive phases/tasks through the mock executor
      executeRunAsync(id, persistence).catch(err =>
        console.error(`[auto-exec] Run ${id} failed:`, err)
      );
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to start run',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Pause run
  router.patch('/:id/pause', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.pauseRun(run);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to pause run',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Resume run
  router.patch('/:id/resume', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.resumeRun(run);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to resume run',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Assign task
  router.patch('/:id/phase/:phaseId/task/:taskId/assign', async (req: Request, res: Response) => {
    try {
      const { id, phaseId, taskId } = req.params;
      const { assignedTo } = req.body;

      if (!assignedTo) {
        throw new ApiError(400, 'assignedTo is required');
      }

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.assignTask(run, phaseId, taskId, assignedTo);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to assign task',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Start task
  router.patch('/:id/phase/:phaseId/task/:taskId/start', async (req: Request, res: Response) => {
    try {
      const { id, phaseId, taskId } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.startTask(run, phaseId, taskId);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to start task',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Complete task
  router.patch('/:id/phase/:phaseId/task/:taskId/complete', async (req: Request, res: Response) => {
    try {
      const { id, phaseId, taskId } = req.params;
      const { output } = req.body;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.completeTask(run, phaseId, taskId, output);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to complete task',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Fail task
  router.patch('/:id/phase/:phaseId/task/:taskId/fail', async (req: Request, res: Response) => {
    try {
      const { id, phaseId, taskId } = req.params;
      const { error } = req.body;

      if (!error) {
        throw new ApiError(400, 'error message is required');
      }

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.failTask(run, phaseId, taskId, error);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to fail task',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get logs for a specific run
  router.get('/:id/logs', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const allLogs = await persistence.list<{ id: string; runId: string; timestamp: string; level: string; message: string; phaseId?: string; taskId?: string; source?: string }>('run-logs');
      const runLogs = allLogs.filter(log => log.runId === id).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      res.json(createResponse(runLogs));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch logs', timestamp: new Date().toISOString() });
      }
    }
  });

  // Cost tracking endpoints
  const costTracker = new CostTracker();

  // Get cost summary for a specific run
  router.get('/:id/costs', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const costSummary = costTracker.getCostSummary(run);
      const costBreakdown = costTracker.getCostBreakdown(run);

      res.json(createResponse({
        summary: costSummary,
        breakdown: costBreakdown,
        totalCost: run.totalCost,
      }));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to fetch run costs',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get cost statistics across all runs
  router.get('/costs/summary', async (req: Request, res: Response) => {
    try {
      const allRuns = await persistence.list<Run>('runs');

      const statistics = costTracker.getStatistics(allRuns);
      const trends = costTracker.getCostTrend(allRuns);

      res.json(createResponse({
        statistics,
        trends,
        runsCount: allRuns.length,
        completedRunsCount: allRuns.filter(run => run.totalCost).length,
      }));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch cost statistics',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Failure analysis for a failed run
  router.get('/:id/failure-analysis', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const run = await persistence.read<Run>('runs', id);
      if (!run) throw new ApiError(404, 'Run not found');

      const classifier = new FailureClassifier();
      const strategist = new RepairStrategist();

      // Find failed tasks across all phases
      const failedTasks: Array<{
        taskId: string;
        taskName: string;
        phaseId: string;
        error: string;
        classification: ReturnType<typeof classifier.classify>;
        repairOptions: ReturnType<typeof strategist.getRepairOptions>;
      }> = [];

      for (const phase of run.phases || []) {
        for (const task of phase.tasks || []) {
          if (task.status === 'failed' && task.error) {
            const classification = classifier.classify({ errorMessage: task.error, taskId: task.id, phaseId: phase.id, runId: id });
            const repairOpts = strategist.getRepairOptions(
              classification.failureType,
              classification,
              task.name
            );
            failedTasks.push({
              taskId: task.id,
              taskName: task.name,
              phaseId: phase.id,
              error: task.error,
              classification,
              repairOptions: repairOpts,
            });
          }
        }
      }

      const overallClassification = run.errorMessage
        ? classifier.classify({ errorMessage: run.errorMessage, taskId: 'run', phaseId: 'run', runId: id })
        : null;

      res.json(createResponse({
        runId: id,
        runError: run.errorMessage || null,
        overallClassification,
        failedTasks,
        suggestedAction: failedTasks.length > 0 ? 'retry' : 'manual',
      }));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Analysis failed', timestamp: new Date().toISOString() });
      }
    }
  });

  router.post('/:id/materialize', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const artifactStore = new ArtifactStore(persistence, {
        storagePath: getArtifactsDirectory(persistence),
      });
      const outputParser = new OutputParser();
      const materialized = await materializeRunArtifacts(run, artifactStore, outputParser);

      if (run.startedAt || run.completedAt) {
        const runCompletion = new RunCompletion();
        await refreshRunSummary(persistence, artifactStore, runCompletion, run);
      }

      res.json(createResponse(materialized));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to materialize run artifacts',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Produced-app output directory: the local folder where this run's files were written.
  router.get('/:id/output', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const { repoRoot, dir } = resolveOutputDir(id);
      let exists = false;
      try {
        exists = (await fs.stat(dir)).isDirectory();
      } catch {
        exists = false;
      }
      const listing = exists
        ? await collectProducedFiles(dir)
        : { files: [], count: 0, truncated: false, hasNodeModules: false };

      res.json(
        createResponse({
          runId: id,
          path: dir,
          relativePath: path.relative(repoRoot, dir).split(path.sep).join('/'),
          exists,
          fileCount: listing.count,
          truncated: listing.truncated,
          hasNodeModules: listing.hasNodeModules,
          files: listing.files,
        })
      );
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to read output directory',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Reveal the produced-app directory in the OS file manager (local-dev convenience).
  router.post('/:id/reveal-output', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const { dir } = resolveOutputDir(id);
      let exists = false;
      try {
        exists = (await fs.stat(dir)).isDirectory();
      } catch {
        exists = false;
      }
      if (!exists) {
        throw new ApiError(404, 'No output directory has been produced for this run yet');
      }

      const opener =
        process.platform === 'win32'
          ? { cmd: 'explorer.exe', args: [dir] }
          : process.platform === 'darwin'
            ? { cmd: 'open', args: [dir] }
            : { cmd: 'xdg-open', args: [dir] };
      // Fire-and-forget: explorer.exe exits non-zero even on success, so don't await/inspect exit.
      const child = spawn(opener.cmd, opener.args, { detached: true, stdio: 'ignore' });
      child.on('error', err => console.warn(`[reveal-output] failed to open ${dir}:`, err));
      child.unref();

      res.json(createResponse({ opened: true, path: dir }));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to reveal output directory',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Skip the current failed phase and mark run as failed/recovered
  router.patch('/:id/skip-phase', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const run = await persistence.read<Run>('runs', id);
      if (!run) throw new ApiError(404, 'Run not found');

      if (run.status !== 'failed') {
        throw new ApiError(400, 'Run must be in failed state to skip a phase');
      }

      // Mark any failed tasks in the current phase as 'skipped', reset run to running
      const now = new Date().toISOString();
      const updatedRun: Run = {
        ...run,
        status: 'running',
        errorMessage: undefined,
        phases: run.phases.map(p => {
          if (p.status !== 'failed') return p;
          return {
            ...p,
            status: 'completed' as const,
            completedAt: now,
            tasks: p.tasks.map(t =>
              t.status === 'failed'
                ? { ...t, status: 'completed' as const, completedAt: now, output: '[SKIPPED BY USER]' }
                : t
            ),
          };
        }),
      };

      const result = await persistence.update<Run>('runs', id, updatedRun);
      res.json(createResponse(result));

      // Resume execution from the next pending phase
      executeRunAsync(id, persistence).catch(err =>
        console.error(`[skip-phase] Run ${id} resume failed:`, err)
      );
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Skip phase failed', timestamp: new Date().toISOString() });
      }
    }
  });

  // Attach generic CRUD routes
  const crudRoutes = createGenericCrudRoutes(persistence, validation, 'runs', 'run');
  router.use(crudRoutes);

  return router;
};
