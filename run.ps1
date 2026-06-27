[CmdletBinding()]
param(
    [ValidateSet('Menu', 'Launch', 'Run', 'Check', 'Build', 'Dev', 'Stop', 'RepairNpm', 'OpenOutput')]
    [string]$Action = 'Menu',

    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$entry = Join-Path $repoRoot 'scripts\vgene.ps1'

if (-not (Test-Path -LiteralPath $entry)) {
    throw "Missing script: $entry"
}

& $entry -Action $Action
$exitCode = $LASTEXITCODE

if ($Action -eq 'Menu' -and -not $NoPause) {
    Write-Host ''
    Read-Host '按 Enter 关闭窗口' | Out-Null
}

exit $exitCode
