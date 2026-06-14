#requires -Version 7.0
<#
.SYNOPSIS
    Roadmap orchestration watcher. Drives a phase-sliced roadmap by invoking
    Claude Code headless runs, gating each transition on an independent
    ReviewGate/Critic verification, and carrying amendments forward via a
    durable state artifact (NOT --resume).

.DESCRIPTION
    Outer loop  : one iteration per roadmap phase (deterministic selection here).
    Inner loop  : Engineer -> Critic, capped at 3 (your existing Critic loop).
    Handoff     : .orchestration/state.json + a Historian "memory capsule".
                  Phase context is passed as data on disk, never as resumed
                  conversation history.

    Phase SELECTION is deterministic and lives here in PowerShell.
    Phase EXECUTION + ASSESSMENT is delegated to Claude Code.
    That separation is the whole point: the model executes and self-reports;
    your code decides what runs next and whether the self-report is trustworthy.

.NOTES
    Skeleton. Search for [TODO] markers for the parts you must fill in for
    UnifiedAIToolbox specifics (roadmap source, agent prompt assembly, etc.).
#>

[CmdletBinding()]
param(
    [string]$RepoRoot       = (Split-Path $PSScriptRoot -Parent),  # parent of script directory
    [string]$RoadmapPath    = 'roadmap.json',                       # roadmap at repo root
    [string]$StateDir       = '.orchestration',                     # state at repo root
    [int]   $MaxPhases      = 50,                                    # outer dead-man's-switch
    [int]   $MaxCriticLoops = 3,                                    # matches agent-library cap
    [ValidateSet('low','medium','high','xhigh','max')]
    [string]$Effort         = 'high',                                # per-run effort level
    [decimal]$MaxBudgetPerRunUsd = 10.0,                            # per-run budget cap
    [decimal]$MaxTotalCostUsd = 25.0,                               # hard budget kill-switch
    [string]$AllowedTools   = 'Read,Grep,Glob,Edit,Write',          # scope tightly; Bash excluded by default
    # Path to the verbatim agent system prompts + schemas. Defaults to the skill
    # mount; OVERRIDE this to your local agent-library install on your machine.
    [string]$AgentRefPath   = 'C:\\Users\\benfu\\.claude\\skills\\agent-library\\agent-library\\references\\agents-full.md',
    [switch]$Reset,                                                  # wipe state.json before running (fresh roadmap)
    [switch]$DryRun                                                  # plan only; no claude calls
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# --- paths -----------------------------------------------------------------
# Resolve all paths relative to $RepoRoot
$RepoRoot    = (Convert-Path $RepoRoot)  # absolute path
$RoadmapPath = Join-Path $RepoRoot $RoadmapPath
$StateDir    = Join-Path $RepoRoot $StateDir
$StatePath   = Join-Path $StateDir 'state.json'
$LogPath     = Join-Path $StateDir 'orchestrator.log'
$CapsuleDir  = Join-Path $StateDir 'capsules'
New-Item -ItemType Directory -Force -Path $StateDir, $CapsuleDir | Out-Null

if ($Reset -and (Test-Path $StatePath)) {
    Remove-Item $StatePath -Force
    Write-Host "Reset: cleared $StatePath"
}

# --- logging ---------------------------------------------------------------
function Write-Log {
    param([string]$Message, [ValidateSet('INFO','WARN','ERROR','GATE')]$Level = 'INFO')
    $line = "{0} [{1}] {2}" -f (Get-Date -Format 'o'), $Level, $Message
    $line | Tee-Object -FilePath $LogPath -Append | Write-Host
}

# --- state -----------------------------------------------------------------
# state.json is the single source of truth across runs. The model writes to it;
# we validate it. If it is malformed or unchanged after a run, we HALT rather
# than loop on a silent failure.
function Get-State {
    if (-not (Test-Path $StatePath)) {
        return [ordered]@{
            schema_version = 1
            run_id         = [guid]::NewGuid().ToString()
            completed      = @()           # array of phase ids
            current        = $null
            carryover      = @()           # amendments the *next* phase must address
            total_cost_usd = 0.0
            history        = @()           # one entry per phase attempt
        }
    }
    try   { return Get-Content $StatePath -Raw | ConvertFrom-Json -AsHashtable }
    catch { throw "state.json is corrupt: $($_.Exception.Message). Halting for human review." }
}

function Save-State {
    param($State)
    $State | ConvertTo-Json -Depth 12 | Set-Content -Path $StatePath -Encoding utf8
}

# --- roadmap / phase selection (DETERMINISTIC, stays in your code) ---------
function Get-NextPhase {
    param($State)
    # [TODO] Load your real 0.4-2.4 roadmap. Expected shape per phase:
    #   { "id": "0.4", "title": "...", "depends_on": ["0.3"], "job_type": "build_new_app" }
    if (-not (Test-Path $RoadmapPath)) { throw "Roadmap not found at $RoadmapPath" }

    try {
        $raw = Get-Content $RoadmapPath -Raw
        if ([string]::IsNullOrWhiteSpace($raw)) { throw "Roadmap file is empty" }
        $phases = $raw | ConvertFrom-Json
    }
    catch {
        throw "Failed to parse roadmap.json: $($_.Exception.Message)"
    }

    $done = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($c in $State.completed) { [void]$done.Add($c) }

    foreach ($p in $phases) {
        if ($done.Contains($p.id)) { continue }
        $deps = @($p.depends_on)
        $ready = $true
        foreach ($d in $deps) { if (-not $done.Contains($d)) { $ready = $false; break } }
        if ($ready) { return $p }   # first eligible phase in roadmap order
    }
    return $null   # nothing left -> roadmap complete
}

# --- prompt assembly -------------------------------------------------------
# The carryover (amendments the previous phase flagged) is injected here so the
# next run is explicitly told to address them BEFORE executing its own phase.
function Build-PhasePrompt {
    param($Phase, $State)

    # --- amendments from the previous phase (the carry-forward channel) ----
    $carryover = if (@($State.carryover).Count) {
        (@($State.carryover) | ForEach-Object { "  - $_" }) -join "`n"
    } else { '  (none)' }

    # --- select the pipeline for this phase's job_type ---------------------
    # Pipelines are documented verbatim in CLAUDE.md; we name the ordered
    # stages here so the run knows exactly which agents to dispatch and in
    # what order. The full system prompt + output schema for each agent is in
    # the agent-library reference (path below), which the run reads per stage.
    $pipeline = switch ($Phase.job_type) {
        'maintain_existing_app' {
            @(
                'RepoContextBuilder', 'ReviewGate', 'Researcher', 'ConceptualModelContract',
                'Engineer', 'Critic (loop to Engineer on fail, cap 3)', 'PRPublisher',
                'Synthesizer', 'Commissioner', 'Supervisor', 'Historian'
            )
        }
        default {  # build_new_app
            @(
                'RepoContextBuilder', 'Researcher', 'ConceptualModelContract',
                'Engineer', 'Critic (loop to Engineer on fail, cap 3)',
                'Synthesizer', 'Commissioner', 'Supervisor', 'Historian'
            )
        }
    }
    $pipelineList = ($pipeline | ForEach-Object { "    $_" }) -join "`n"

    # --- roadmap-entry detail, if present on the phase object --------------
    $objective    = if ($Phase.PSObject.Properties.Name -contains 'objective') { $Phase.objective } else { $Phase.title }
    $acceptance   = if ($Phase.PSObject.Properties.Name -contains 'acceptance') {
        (@($Phase.acceptance) | ForEach-Object { "    - $_" }) -join "`n"
    } else { '    (none specified — infer runtime-verifiable criteria and record them)' }

    # NOTE: $AgentRefPath is resolved from the script param so you can point it
    # at your local agent-library install. It defaults below in the param block.
    @"
You are executing ONE phase of the UnifiedAIToolbox roadmap as an orchestrated
headless run. The project contract in CLAUDE.md at the repo root is binding —
follow it. Do not choose the next phase; the watcher does that.

PHASE
  id:        $($Phase.id)
  title:     $($Phase.title)
  job_type:  $($Phase.job_type)
  objective: $objective

ACCEPTANCE CRITERIA (what "done" means for this phase):
$acceptance

OUTSTANDING AMENDMENTS carried over from the previous phase.
Address these BEFORE executing this phase's own work:
$carryover

PIPELINE — dispatch these agents in order. Each agent's verbatim system prompt
and output schema is in:
    $AgentRefPath
Read the relevant agent section, dispatch it as a focused Agent tool call with
its system prompt embedded, and append "Return strict JSON only. No markdown,
no prose." Parse each output as JSON before passing it to the next stage.
$pipelineList

EXECUTION PARAMETERS
  - Effort level: $Effort
  - Per-run budget cap: \$$MaxBudgetPerRunUsd
  - Allowed tools: $AllowedTools

LOOP RULE
  Critic verdict = fail (blockers non-empty, schema invalid, or missing
  traceability) → loop back to Engineer with the Critic's issues[]. Cap at 3.
  If still failing after 3, do NOT report complete: report needs-amendment
  (or blocked if structural) and put the unresolved blockers in carryover.

CLARIFICATION RULE
  If ConceptualModelContract / Synthesizer / Supervisor / Historian returns
  { "clarification_request": "..." }, treat the phase as blocked: put the
  question text in carryover and stop. Do not guess past it.

REPORTING — when finished you MUST overwrite:
    $StatePath
per the schema in .orchestration/STATE_SCHEMA.md. Specifically:
  - Append "$($Phase.id)" to "completed" ONLY IF status is complete.
  - Set "current" to "$($Phase.id)".
  - REPLACE "carryover" with the amendments the NEXT phase must address first
    (empty array [] if none).
  - Append ONE entry to "history": { "phase": "$($Phase.id)", "status": ...,
    "critic_verdict": ..., "notes": ... }.
  - Do NOT modify "total_cost_usd" — the orchestrator owns it.
  - Preserve "schema_version" and "run_id" verbatim.
  status MUST be exactly one of: complete | needs-amendment | blocked.

Also write the Historian memory capsule to:
    $(Join-Path $CapsuleDir "$($Phase.id).txt")
as plain text with headers DECISIONS / CONSTRAINTS / INTERFACES / DATA / RISKS / NEXT.

An independent ReviewGate/Critic pass will re-verify this phase after you report.
Report the true status — a false "complete" is rejected by the gate anyway.
"@
}

# --- the claude headless call ---------------------------------------------
function Invoke-ClaudeRun {
    param([string]$Prompt)

    if ($DryRun) {
        Write-Log "DRYRUN: would invoke claude -p (prompt length $($Prompt.Length))" 'INFO'
        return [pscustomobject]@{ is_error = $false; result = '{"dryrun":true}'; total_cost_usd = 0.0; exit_code = 0 }
    }

    # -p prints output; --output-format json for structured results;
    # --effort controls computational budget; --allowedTools scopes attack surface
    # (no human is present to approve tool calls). stderr is teed to the log.
    $args = @(
        '-p', $Prompt
        '--output-format', 'json'
        '--effort', $Effort
        '--max-budget-usd', $MaxBudgetPerRunUsd
        '--allowedTools', $AllowedTools
    )

    Push-Location $RepoRoot
    try {
        $env:CLAUDE_CODE_DEBUG = '1'
        $raw  = & claude @args 2>> $LogPath
        $code = $LASTEXITCODE
    }
    finally { Pop-Location }

    if ($code -ne 0) {
        return [pscustomobject]@{ is_error = $true; result = "claude exited $code"; total_cost_usd = 0.0; exit_code = $code }
    }

    try {
        if ([string]::IsNullOrWhiteSpace($raw)) {
            return [pscustomobject]@{ is_error = $true; result = "Claude produced no output"; total_cost_usd = 0.0; exit_code = -1 }
        }

        $obj = $raw | ConvertFrom-Json
        if ($null -eq $obj) {
            return [pscustomobject]@{ is_error = $true; result = "Claude output parsed to null"; total_cost_usd = 0.0; exit_code = -1 }
        }

        return [pscustomobject]@{
            is_error       = [bool]$obj.is_error
            result         = $obj.result
            total_cost_usd = [decimal]($obj.total_cost_usd ?? 0)
            session_id     = $obj.session_id
            exit_code      = 0
        }
    }
    catch {
        return [pscustomobject]@{ is_error = $true; result = "unparseable JSON from claude: $_"; total_cost_usd = 0.0; exit_code = -1 }
    }
}

# --- the independent gate --------------------------------------------------
# Do NOT trust the executing run's self-reported "complete". Run a separate,
# read-only Critic pass that re-verifies against the repo. This is
# the mitigation for false-completion.
function Test-PhaseGate {
    param($Phase)

    if ($DryRun) { return $true }

    # Critic system prompt: independent verification that phase actually completed
    $gatePrompt = @"
You are the Critic. Your job: independently verify that phase $($Phase.id) "$($Phase.title)"
is genuinely complete against the current repository state. Do not trust the prior run's
self-report. Examine the actual repo to verify:

1. All deliverables specified in the acceptance criteria actually exist and are correct
2. Artifact changes match what was promised
3. No critical errors were introduced
4. Traceability IDs are present (if applicable)
5. Schema validation would pass

Acceptance criteria for this phase:
$(if ($Phase.PSObject.Properties.Name -contains 'acceptance') { $Phase.acceptance | ForEach-Object { "  - $_" } } else { "  (verify against the stated objective)" })

OUTPUT FORMAT (CRITICAL — NO DEVIATIONS):
- Return ONLY a raw JSON object. Do not wrap in markdown code fences.
- Do not add any prose, explanations, or preamble before or after.
- Start immediately with the opening brace {.
- End immediately with the closing brace }.
- Valid example output (literally copy this format):
{"verdict":"pass","blockers":[],"evidence":"All acceptance criteria met."}
"@

    $args = @('-p', $gatePrompt, '--output-format', 'json', '--effort', 'high', '--max-budget-usd', 2.0, '--allowedTools', 'Read,Grep,Glob')
    Push-Location $RepoRoot
    try { $raw = & claude @args 2>> $LogPath; $code = $LASTEXITCODE }
    finally { Pop-Location }

    if ($code -ne 0) { Write-Log "Gate call failed (exit $code) for phase $($Phase.id)" 'ERROR'; return $false }

    try {
        if ([string]::IsNullOrWhiteSpace($raw)) {
            Write-Log "Gate returned empty output for phase $($Phase.id)" 'ERROR'
            return $false
        }

        # Extract JSON by finding first { and last }. This is robust against:
        # - Markdown code fences (```json ... ```)
        # - Backticks (single or multiple)
        # - Prose before/after JSON
        $jsonStart = $raw.IndexOf('{')
        $jsonEnd = $raw.LastIndexOf('}')

        if ($jsonStart -lt 0 -or $jsonEnd -lt 0 -or $jsonEnd -le $jsonStart) {
            Write-Log "Gate: no JSON found. Raw start: $($raw.Substring(0, [Math]::Min(50, $raw.Length)))" 'ERROR'
            return $false
        }

        $cleaned = $raw.Substring($jsonStart, $jsonEnd - $jsonStart + 1)

        # Debug: log what we extracted
        $preview = $cleaned.Substring(0, [Math]::Min(60, $cleaned.Length))
        Write-Log "Gate: JSON extracted (pos $jsonStart-$jsonEnd, len $($cleaned.Length)). Preview: $preview" 'INFO'

        # Parse the output - it may be nested (Claude JSON wrapper) or direct JSON
        $parsed = $cleaned | ConvertFrom-Json -ErrorAction Stop

        # Check if result is a string that needs parsing (Claude JSON wrapper case)
        # or already the gate verdict object
        $g = if ($parsed.PSObject.Properties.Name -contains 'result' -and $parsed.result -is [string]) {
            $parsed.result | ConvertFrom-Json -ErrorAction Stop
        } else {
            $parsed
        }

        if ($g.verdict -eq 'pass') { return $true }
        Write-Log "GATE FAIL phase $($Phase.id): $([string]::Join('; ', @($g.blockers)))" 'GATE'
        return $false
    }
    catch {
        Write-Log "Gate output unparseable for phase $($Phase.id): $_ | Raw: $($raw.Substring(0, [Math]::Min(150, $raw.Length)))" 'ERROR'
        # If gate fails to parse, be conservative: reject the phase rather than blindly advancing
        return $false
    }
}

# ===========================================================================
#  MAIN LOOP
# ===========================================================================
Write-Log "Orchestrator start. Repo=$RepoRoot DryRun=$DryRun" 'INFO'
$state   = Get-State
$counter = 0

while ($counter -lt $MaxPhases) {
    $counter++

    # --- budget kill-switch ------------------------------------------------
    if ([decimal]$state.total_cost_usd -ge $MaxTotalCostUsd) {
        Write-Log "Budget cap hit (`$$($state.total_cost_usd) >= `$$MaxTotalCostUsd). Halting." 'ERROR'
        break
    }

    # --- deterministic phase pick -----------------------------------------
    $phase = Get-NextPhase -State $state
    if ($null -eq $phase) { Write-Log 'Roadmap complete. No eligible phases remain.' 'INFO'; break }
    Write-Log "Selected phase $($phase.id): $($phase.title)" 'INFO'

    # --- capture state mtime so we can detect a no-op run ------------------
    $beforeMtime = (Test-Path $StatePath) ? (Get-Item $StatePath).LastWriteTimeUtc : [datetime]::MinValue

    # --- execute (Engineer->Critic loop lives INSIDE the run) -------------
    $prompt = Build-PhasePrompt -Phase $phase -State $state
    $run    = Invoke-ClaudeRun -Prompt $prompt

    # accumulate cost ourselves; the run was told not to touch this field
    $state = Get-State
    $state.total_cost_usd = [decimal]$state.total_cost_usd + $run.total_cost_usd

    if ($run.is_error) {
        Write-Log "Run errored for phase $($phase.id): $($run.result). Halting for human review." 'ERROR'
        $state.current = $phase.id
        Save-State $state
        break   # block-and-surface beats auto-continue past a failed phase
    }

    if ($DryRun) {
        # No claude call happened, so nothing wrote state. Simulate a clean
        # pass purely to exercise phase SELECTION + dependency ordering, which
        # is the only thing Layer 0 is testing. We do NOT touch the real
        # state file's "completed" beyond this in-memory advance.
        Write-Log "DRYRUN: simulating PASS for phase $($phase.id) to test selection ordering" 'INFO'
        if ($state.completed -notcontains $phase.id) { $state.completed += $phase.id }
        Save-State $state
        continue
    }

    # --- did the run actually update state? -------------------------------
    $afterMtime = (Test-Path $StatePath) ? (Get-Item $StatePath).LastWriteTimeUtc : [datetime]::MinValue
    if ($afterMtime -le $beforeMtime) {
        Write-Log "Run did not update state.json for phase $($phase.id). Halting." 'ERROR'
        break
    }
    $state = Get-State   # reload what the run wrote

    # --- read the run's self-report ---------------------------------------
    $lastHist = $state.history | Select-Object -Last 1
    if ($null -eq $lastHist) {
        Write-Log "FATAL: No history entry for phase $($phase.id). Run may have failed silently." 'ERROR'
        break
    }
    $selfStatus = $lastHist.status
    Write-Log "Self-reported status for $($phase.id): $selfStatus" 'INFO'

    if ($selfStatus -eq 'blocked') {
        Write-Log "Phase $($phase.id) reported BLOCKED. Halting for human review." 'WARN'
        break
    }

    # --- INDEPENDENT gate before we accept completion ---------------------
    if (-not (Test-PhaseGate -Phase $phase)) {
        Write-Log "Independent gate rejected phase $($phase.id). Not advancing." 'GATE'
        # leave it out of completed; carryover already holds amendments
        Save-State $state
        break
    }

    # --- accept ------------------------------------------------------------
    if ($state.completed -notcontains $phase.id) { $state.completed += $phase.id }
    Save-State $state
    Write-Log "Phase $($phase.id) accepted. Carryover for next: $([string]::Join('; ', @($state.carryover)))" 'INFO'
}

if ($counter -ge $MaxPhases) { Write-Log "Hit MaxPhases cap ($MaxPhases). Halting." 'WARN' }
Write-Log "Orchestrator stop. Completed: $([string]::Join(', ', @($state.completed)))  Spend: `$$($state.total_cost_usd)" 'INFO'
