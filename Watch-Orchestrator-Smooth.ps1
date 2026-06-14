<#
.SYNOPSIS
    Smooth real-time monitoring dashboard for roadmap orchestrator.

.DESCRIPTION
    Displays the roadmap orchestrator state without repeatedly clearing the terminal.
    Uses an ANSI alternate screen buffer, fixed-size rendering, and cursor repositioning
    to reduce flicker/blinking.

.EXAMPLE
    .\Watch-Orchestrator-Smooth.ps1
    .\Watch-Orchestrator-Smooth.ps1 -RefreshInterval 2 -LogLines 12
    .\Watch-Orchestrator-Smooth.ps1 -NoAlternateScreen
#>

[CmdletBinding()]
param(
    [int]$RefreshInterval = 2,
    [int]$LogLines = 14,
    [string]$RepoRoot = (Get-Location).Path,
    [switch]$NoAlternateScreen,
    [switch]$OnlyRefreshOnChange
)

$ErrorActionPreference = 'SilentlyContinue'

$StateFile = Join-Path $RepoRoot '.orchestration' 'state.json'
$LogFile = Join-Path $RepoRoot '.orchestration' 'orchestrator.log'
$RoadmapFile = Join-Path $RepoRoot 'roadmap.json'

$Esc = [char]27
$Ansi = @{
    Reset      = "$Esc[0m"
    Bold       = "$Esc[1m"
    Dim        = "$Esc[2m"
    HideCursor = "$Esc[?25l"
    ShowCursor = "$Esc[?25h"
    AltScreen  = "$Esc[?1049h"
    MainScreen = "$Esc[?1049l"
    Home       = "$Esc[H"
    Clear      = "$Esc[2J"
    ClearLine  = "$Esc[2K"

    Green      = "$Esc[32m"
    Red        = "$Esc[31m"
    Yellow     = "$Esc[33m"
    Blue       = "$Esc[34m"
    Cyan       = "$Esc[36m"
    White      = "$Esc[37m"
    Gray       = "$Esc[90m"
}

function Get-TerminalWidth {
    try {
        $width = [Console]::WindowWidth
        if ($width -lt 80) { return 80 }
        return [Math]::Min($width, 140)
    } catch {
        return 100
    }
}

function Get-TerminalHeight {
    try {
        $height = [Console]::WindowHeight
        if ($height -lt 24) { return 24 }
        return $height
    } catch {
        return 30
    }
}

function Remove-Ansi {
    param([string]$Text)
    return ($Text -replace "`e\[[0-9;?]*[A-Za-z]", "")
}

function Fit-Text {
    param(
        [string]$Text,
        [int]$Width
    )

    if ($null -eq $Text) { $Text = "" }

    $plain = Remove-Ansi $Text
    if ($plain.Length -gt $Width) {
        if ($Width -le 3) { return $plain.Substring(0, $Width) }
        return $plain.Substring(0, $Width - 3) + "..."
    }

    return $Text + (" " * ($Width - $plain.Length))
}

function Color {
    param(
        [string]$Text,
        [string]$Name = 'White'
    )

    return "$($Ansi[$Name])$Text$($Ansi.Reset)"
}

function Get-FileSignature {
    $parts = @()

    foreach ($path in @($StateFile, $RoadmapFile, $LogFile)) {
        if (Test-Path $path) {
            $item = Get-Item $path
            $parts += "$path|$($item.LastWriteTimeUtc.Ticks)|$($item.Length)"
        } else {
            $parts += "$path|missing"
        }
    }

    return ($parts -join ';')
}

function Get-State {
    if (Test-Path $StateFile) {
        try { return Get-Content $StateFile -Raw | ConvertFrom-Json }
        catch { return $null }
    }

    return $null
}

function Get-Roadmap {
    if (Test-Path $RoadmapFile) {
        try { return @(Get-Content $RoadmapFile -Raw | ConvertFrom-Json) }
        catch { return @() }
    }

    return @()
}

function Get-LogTail {
    if (Test-Path $LogFile) {
        return @(Get-Content $LogFile -Tail $LogLines -ErrorAction SilentlyContinue)
    }

    return @()
}

function Format-LogLine {
    param([string]$Line)

    if ($Line -match '\[ERROR\]') { return Color $Line 'Red' }
    if ($Line -match '\[WARN\]') { return Color $Line 'Yellow' }
    if ($Line -match 'GATE PASS') { return Color $Line 'Green' }
    if ($Line -match 'GATE FAIL') { return Color $Line 'Red' }
    if ($Line -match '\[GATE\]') { return Color $Line 'Blue' }
    if ($Line -match '\[INFO\]') { return Color $Line 'Cyan' }

    return $Line
}

function Get-PhaseStatus {
    param(
        [string]$PhaseId,
        $State
    )

    if (-not $State) { return @{ Label = 'Pending'; Glyph = '○'; Color = 'Gray' } }

    if (@($State.completed) -contains $PhaseId) {
        return @{ Label = 'Complete'; Glyph = '●'; Color = 'Green' }
    }

    if ($State.current -eq $PhaseId) {
        return @{ Label = 'Running'; Glyph = '◆'; Color = 'Cyan' }
    }

    if ($State.history | Where-Object { $_.phase -eq $PhaseId -and $_.status -eq 'failed' }) {
        return @{ Label = 'Failed'; Glyph = '×'; Color = 'Red' }
    }

    return @{ Label = 'Pending'; Glyph = '○'; Color = 'Gray' }
}

function New-Rule {
    param(
        [int]$Width,
        [string]$Left = "",
        [string]$ColorName = "Blue"
    )

    $contentWidth = $Width - 2
    if ([string]::IsNullOrWhiteSpace($Left)) {
        return (Color ("─" * $Width) $ColorName)
    }

    $label = " $Left "
    $remaining = [Math]::Max(0, $contentWidth - (Remove-Ansi $label).Length)
    return (Color "─" $ColorName) + (Color $label "Bold") + (Color ("─" * $remaining) $ColorName)
}

function Build-Dashboard {
    $width = Get-TerminalWidth
    $height = Get-TerminalHeight
    $contentWidth = $width - 4

    $state = Get-State
    $roadmap = Get-Roadmap
    $logLines = Get-LogTail

    $lines = New-Object System.Collections.Generic.List[string]

    $lines.Add((New-Rule -Width $width -Left "ROADMAP ORCHESTRATOR" -ColorName "Blue"))

    if ($state) {
        $completedCount = @($state.completed).Count
        $totalCount = @($roadmap).Count
        $progressPct = if ($totalCount -gt 0) { [math]::Round(($completedCount / $totalCount) * 100) } else { 0 }
        $current = if ($state.current) { $state.current } else { "Idle" }
        $cost = if ($null -ne $state.total_cost_usd) { [math]::Round([decimal]$state.total_cost_usd, 4) } else { 0 }

        $statusColor = if ($state.current) { "Cyan" } else { "Gray" }
        $lines.Add((Fit-Text ("Status: " + (Color $current $statusColor) + "  Progress: " + (Color "$completedCount/$totalCount ($progressPct%)" "Green") + "  Cost: " + (Color "`$$cost" "Green")) $width))
    } else {
        $lines.Add((Fit-Text ("Status: " + (Color "Waiting for orchestrator state..." "Gray")) $width))
        $completedCount = 0
        $totalCount = @($roadmap).Count
        $progressPct = 0
    }

    $barWidth = [Math]::Min(60, [Math]::Max(20, $width - 28))
    $filled = if ($totalCount -gt 0) { [math]::Round($barWidth * $completedCount / $totalCount) } else { 0 }
    $bar = (Color ("█" * $filled) "Green") + (Color ("░" * ($barWidth - $filled)) "Gray")
    $lines.Add((Fit-Text ("Progress: [$bar]") $width))

    $lines.Add((New-Rule -Width $width -Left "PHASES" -ColorName "Blue"))

    if ($roadmap.Count -gt 0) {
        $phaseTokens = foreach ($phase in ($roadmap | Sort-Object { [decimal]($_.id -replace '[^0-9.]','') })) {
            $status = Get-PhaseStatus -PhaseId $phase.id -State $state
            Color "$($status.Glyph)$($phase.id)" $status.Color
        }

        $line = ""
        foreach ($token in $phaseTokens) {
            $candidate = if ($line) { "$line  $token" } else { $token }
            if ((Remove-Ansi $candidate).Length -gt $width) {
                $lines.Add((Fit-Text $line $width))
                $line = $token
            } else {
                $line = $candidate
            }
        }
        if ($line) { $lines.Add((Fit-Text $line $width)) }
    } else {
        $lines.Add((Fit-Text (Color "No roadmap.json found or roadmap is empty." "Gray") $width))
    }

    if ($state -and $state.current) {
        $currentPhase = $roadmap | Where-Object { $_.id -eq $state.current } | Select-Object -First 1
        $title = if ($currentPhase) { $currentPhase.title } else { "" }
        $lines.Add((Fit-Text ("Current: " + (Color $state.current "Cyan") + " - $title") $width))
    }

    if ($state -and @($state.carryover).Count -gt 0) {
        $carry = @($state.carryover)[0]
        $lines.Add((Fit-Text ("Carryover: " + (Color $carry "Yellow")) $width))
    }

    $lines.Add((New-Rule -Width $width -Left "LOG tail: $LogLines lines" -ColorName "Blue"))

    $availableLogLines = [Math]::Max(3, $height - $lines.Count - 3)
    $shownLogs = @($logLines | Select-Object -Last $availableLogLines)

    if ($shownLogs.Count -gt 0) {
        foreach ($line in $shownLogs) {
            $lines.Add((Fit-Text (Format-LogLine $line) $width))
        }
    } else {
        $lines.Add((Fit-Text (Color "(waiting for logs...)" "Gray") $width))
    }

    $lines.Add((New-Rule -Width $width -ColorName "Blue"))
    $lines.Add((Fit-Text ("Updated: " + (Get-Date -Format "HH:mm:ss") + " | Refresh: ${RefreshInterval}s | Ctrl+C exits | " + $(if ($OnlyRefreshOnChange) { "refresh-on-change" } else { "continuous" })) $width))

    # Fill remaining screen so stale lines do not remain visible.
    while ($lines.Count -lt ($height - 1)) {
        $lines.Add((" " * $width))
    }

    return ($lines -join "`n")
}

# Main loop.
$lastSignature = $null

try {
    if (-not $NoAlternateScreen) {
        Write-Host -NoNewline $Ansi.AltScreen
    }

    Write-Host -NoNewline $Ansi.HideCursor
    Write-Host -NoNewline $Ansi.Clear

    while ($true) {
        $signature = Get-FileSignature

        if (-not $OnlyRefreshOnChange -or $signature -ne $lastSignature) {
            $dashboard = Build-Dashboard
            Write-Host -NoNewline $Ansi.Home
            Write-Host -NoNewline $dashboard
            $lastSignature = $signature
        }

        Start-Sleep -Seconds $RefreshInterval
    }
}
finally {
    Write-Host -NoNewline $Ansi.ShowCursor
    if (-not $NoAlternateScreen) {
        Write-Host -NoNewline $Ansi.MainScreen
    }
}
