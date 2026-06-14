<#
.SYNOPSIS
    Wrapper script to invoke the roadmap orchestrator from the repo root.

.DESCRIPTION
    This script delegates to orchestrator/Invoke-RoadmapOrchestrator.ps1 with
    proper path resolution and convenient parameter forwarding.

.EXAMPLE
    .\Invoke-Orchestrator.ps1
    .\Invoke-Orchestrator.ps1 -Reset
    .\Invoke-Orchestrator.ps1 -DryRun -MaxTotalCostUsd 5.0
#>

[CmdletBinding()]
param(
    [switch]$Reset,
    [switch]$DryRun,
    [int]$MaxPhases = 50,
    [int]$MaxCriticLoops = 3,
    [ValidateSet('low','medium','high','xhigh','max')]
    [string]$Effort = 'high',
    [decimal]$MaxBudgetPerRunUsd = 10.0,
    [decimal]$MaxTotalCostUsd = 25.0,
    [string]$AllowedTools = 'Read,Grep,Glob,Edit,Write'
)

$orchestratorScript = Join-Path $PSScriptRoot 'orchestrator' 'Invoke-RoadmapOrchestrator.ps1'

$args = @(
    "-RepoRoot", $PSScriptRoot,
    "-RoadmapPath", 'roadmap.json',
    "-StateDir", '.orchestration',
    "-MaxPhases", $MaxPhases,
    "-MaxCriticLoops", $MaxCriticLoops,
    "-Effort", $Effort,
    "-MaxBudgetPerRunUsd", $MaxBudgetPerRunUsd,
    "-MaxTotalCostUsd", $MaxTotalCostUsd,
    "-AllowedTools", $AllowedTools
)

if ($Reset) { $args += '-Reset' }
if ($DryRun) { $args += '-DryRun' }

& $orchestratorScript @args
