<#
.SYNOPSIS
    Elegant real-time monitoring dashboard for roadmap orchestrator.

.DESCRIPTION
    Displays a dynamic dashboard showing:
    - Roadmap progress (completed phases, current, pending)
    - Real-time state (status, cost, carryover)
    - Live log tail with color-coded severity
    - Phase timeline

.EXAMPLE
    .\Watch-Orchestrator.ps1
    .\Watch-Orchestrator.ps1 -RefreshInterval 2  # Update every 2 seconds
    .\Watch-Orchestrator.ps1 -LogLines 15        # Show 15 lines of log
#>

[CmdletBinding()]
param(
    [int]$RefreshInterval = 1,    # seconds between updates
    [int]$LogLines = 20,           # number of log lines to show
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = 'SilentlyContinue'

$StateFile = Join-Path $RepoRoot '.orchestration' 'state.json'
$LogFile = Join-Path $RepoRoot '.orchestration' 'orchestrator.log'
$RoadmapFile = Join-Path $RepoRoot 'roadmap.json'

# ANSI color codes
$Colors = @{
    Reset    = "`e[0m"
    Bold     = "`e[1m"
    Dim      = "`e[2m"

    Green    = "`e[32m"
    Red      = "`e[31m"
    Yellow   = "`e[33m"
    Blue     = "`e[34m"
    Cyan     = "`e[36m"
    White    = "`e[37m"
    Gray     = "`e[90m"

    BgBlue   = "`e[44m"
    BgGreen  = "`e[42m"
}

function Write-Color {
    param([string]$Text, [string]$Color = 'White')
    Write-Host -NoNewline "$($Colors[$Color])$Text$($Colors.Reset)"
}

function Get-State {
    if (Test-Path $StateFile) {
        return Get-Content $StateFile | ConvertFrom-Json
    }
    return $null
}

function Get-Roadmap {
    if (Test-Path $RoadmapFile) {
        return Get-Content $RoadmapFile | ConvertFrom-Json
    }
    return @()
}

function Get-LogTail {
    if (Test-Path $LogFile) {
        $lines = @(Get-Content $LogFile -Tail $LogLines -ErrorAction SilentlyContinue)
        return $lines
    }
    return @()
}

function Format-LogLine {
    param([string]$Line)

    if ($Line -match '\[INFO\]') {
        Write-Color $Line 'Cyan'
    } elseif ($Line -match '\[WARN\]') {
        Write-Color $Line 'Yellow'
    } elseif ($Line -match '\[ERROR\]') {
        Write-Color $Line 'Red'
    } elseif ($Line -match '\[GATE\]') {
        if ($Line -match 'GATE PASS|GATE FAIL') {
            if ($Line -match 'GATE PASS') {
                Write-Color $Line 'Green'
            } else {
                Write-Color $Line 'Yellow'
            }
        } else {
            Write-Color $Line 'Blue'
        }
    } else {
        Write-Host $Line
    }
}

function Get-PhaseStatus {
    param([string]$PhaseId, $State, $Roadmap)

    if (-not $State) {
        return @{ Status = '⏳ Pending'; Color = 'Gray' }
    }

    if ($State.completed -contains $PhaseId) {
        return @{ Status = '✓ Complete'; Color = 'Green' }
    } elseif ($State.current -eq $PhaseId) {
        return @{ Status = '⚡ Running'; Color = 'Cyan' }
    } elseif ($State.history | Where-Object { $_.phase -eq $PhaseId }) {
        return @{ Status = '✗ Failed'; Color = 'Red' }
    } else {
        return @{ Status = '⏳ Pending'; Color = 'Gray' }
    }
}

function Show-Dashboard {
    Clear-Host

    $state = Get-State
    $roadmap = Get-Roadmap
    $logLines = Get-LogTail

    # Header
    Write-Color "╔" 'Blue'
    Write-Color "═" * 78 'Blue'
    Write-Color "╗`n" 'Blue'

    Write-Color "║ " 'Blue'
    Write-Color "🚀 ROADMAP ORCHESTRATOR — PROGRESS MONITOR" 'Bold'
    Write-Color (" " * 29) 'Blue'
    Write-Color "║`n" 'Blue'

    Write-Color "╠" 'Blue'
    Write-Color "═" * 78 'Blue'
    Write-Color "╣`n" 'Blue'

    # Status Summary
    if ($state) {
        $completedCount = @($state.completed).Count
        $totalCount = @($roadmap).Count
        $progressPct = if ($totalCount -gt 0) { [math]::Round(($completedCount / $totalCount) * 100) } else { 0 }

        Write-Color "║ " 'Blue'
        Write-Color "Status: " 'White'

        if ($state.current) {
            Write-Color "Executing " 'Cyan'
            Write-Color "$($state.current)" 'Bold'
        } else {
            Write-Color "Idle" 'Gray'
        }

        Write-Color " | Progress: " 'White'
        Write-Color "$completedCount/$totalCount" 'Green'
        Write-Color " ($progressPct%) | Budget: " 'White'
        Write-Color "`$" 'White'
        Write-Color ([math]::Round($state.total_cost_usd, 2)) 'Green'
        Write-Color (" " * (78 - 65 - $state.current.Length)) 'Blue'
        Write-Color "║`n" 'Blue'
    } else {
        Write-Color "║ " 'Blue'
        Write-Color "Status: " 'White'
        Write-Color "Waiting for orchestrator to start..." 'Gray'
        Write-Color (" " * 25) 'Blue'
        Write-Color "║`n" 'Blue'
    }

    Write-Color "╠" 'Blue'
    Write-Color "═" * 78 'Blue'
    Write-Color "╣`n" 'Blue'

    # Progress bar
    Write-Color "║ " 'Blue'
    Write-Color "Progress: " 'White'

    if ($state -and $totalCount -gt 0) {
        $barLength = 50
        $filledLength = [math]::Round($barLength * $completedCount / $totalCount)
        $barFilled = "█" * $filledLength
        $barEmpty = "░" * ($barLength - $filledLength)

        Write-Color $barFilled 'Green'
        Write-Color $barEmpty 'Gray'
    } else {
        Write-Color "░" * 50 'Gray'
    }

    Write-Color (" " * 15) 'Blue'
    Write-Color "║`n" 'Blue'

    Write-Color "╠" 'Blue'
    Write-Color "═" * 78 'Blue'
    Write-Color "╣`n" 'Blue'

    # Roadmap phases
    Write-Color "║ " 'Blue'
    Write-Color "ROADMAP" 'Bold'
    Write-Color (" " * 70) 'Blue'
    Write-Color "║`n" 'Blue'

    $phaseGroups = $roadmap | Group-Object { $_.id.Substring(0, 1) }

    foreach ($group in $phaseGroups) {
        Write-Color "║ " 'Blue'
        Write-Color "v$($group.Name).x  " 'White'

        $phases = $group.Group | Sort-Object { [decimal]$_.id }
        foreach ($phase in $phases) {
            $status = Get-PhaseStatus $phase.id $state $roadmap

            if ($status.Status -eq '✓ Complete') {
                Write-Color "$($phase.id) " 'Green'
            } elseif ($status.Status -eq '⚡ Running') {
                Write-Color "$($phase.id)◆ " 'Cyan'
            } elseif ($status.Status -eq '✗ Failed') {
                Write-Color "$($phase.id) " 'Red'
            } else {
                Write-Color "$($phase.id) " 'Gray'
            }
        }

        Write-Color (" " * (70 - ((@($phases).Count * 4)))) 'Blue'
        Write-Color "║`n" 'Blue'
    }

    # Current phase details
    if ($state -and $state.current) {
        $currentPhase = $roadmap | Where-Object { $_.id -eq $state.current }

        Write-Color "║ " 'Blue'
        Write-Color "Current: " 'White'
        Write-Color "$($state.current) " 'Cyan'
        Write-Color "– $($currentPhase.title)" 'White'
        Write-Color (" " * (68 - $currentPhase.title.Length)) 'Blue'
        Write-Color "║`n" 'Blue'
    }

    # Carryover amendments
    if ($state -and @($state.carryover).Count -gt 0) {
        Write-Color "║ " 'Blue'
        Write-Color "⚠ Carryover: " 'Yellow'

        $amendments = @($state.carryover)[0]
        if ($amendments.Length -gt 55) {
            $amendments = $amendments.Substring(0, 52) + "..."
        }
        Write-Color $amendments 'Yellow'
        Write-Color (" " * (68 - $amendments.Length)) 'Blue'
        Write-Color "║`n" 'Blue'
    }

    Write-Color "╠" 'Blue'
    Write-Color "═" * 78 'Blue'
    Write-Color "╣`n" 'Blue'

    # Log section
    Write-Color "║ " 'Blue'
    Write-Color "LOG (last $LogLines lines)" 'Bold'
    Write-Color (" " * (64 - $LogLines.ToString().Length)) 'Blue'
    Write-Color "║`n" 'Blue'

    Write-Color "╠" 'Blue'
    Write-Color "═" * 78 'Blue'
    Write-Color "╣`n" 'Blue'

    if ($logLines.Count -gt 0) {
        foreach ($line in $logLines) {
            Write-Color "║ " 'Blue'

            # Truncate log line to fit
            $displayLine = if ($line.Length -gt 74) { $line.Substring(0, 71) + "..." } else { $line }
            Format-LogLine $displayLine

            $paddingLength = 74 - $displayLine.Length
            if ($paddingLength -gt 0) {
                Write-Host -NoNewline (" " * $paddingLength)
            }
            Write-Color "║`n" 'Blue'
        }
    } else {
        Write-Color "║ " 'Blue'
        Write-Color "(waiting for logs...)" 'Gray'
        Write-Color (" " * 51) 'Blue'
        Write-Color "║`n" 'Blue'
    }

    Write-Color "╚" 'Blue'
    Write-Color "═" * 78 'Blue'
    Write-Color "╝`n" 'Blue'

    Write-Color "Last updated: " 'Gray'
    Write-Color (Get-Date -Format "HH:mm:ss") 'White'
    Write-Color " | Refresh: ${RefreshInterval}s | Ctrl+C to exit`n" 'Gray'
}

# Main loop
try {
    while ($true) {
        Show-Dashboard
        Start-Sleep -Seconds $RefreshInterval
    }
} catch {
    if ($_ -notmatch "User interrupted") {
        Write-Error $_
    }
}
