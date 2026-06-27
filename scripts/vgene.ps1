[CmdletBinding()]
param(
    [ValidateSet('Menu', 'Launch', 'Run', 'Check', 'Build', 'Dev', 'Stop', 'RepairNpm', 'OpenOutput')]
    [string]$Action = 'Menu'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$TauriRoot = Join-Path $RepoRoot 'src-tauri'
$ReleaseExe = Join-Path $TauriRoot 'target\release\digital-life-platform.exe'
$ReleaseDir = Join-Path $TauriRoot 'target\release'
$BundleDir = Join-Path $TauriRoot 'target\release\bundle'
$DevPort = 1420
$AppProcessName = 'digital-life-platform'
$PortableNodeVersion = '24.16.0'
$PortableNodeName = "node-v$PortableNodeVersion-win-x64"
$PortableRoot = Join-Path $env:LOCALAPPDATA 'VGene'
$RuntimeLog = Join-Path $PortableRoot 'run.log'
$PortableNodeDir = Join-Path (Join-Path $PortableRoot 'node') $PortableNodeName
$PortableNodeExe = Join-Path $PortableNodeDir 'node.exe'
$PortableNodeZip = Join-Path (Join-Path $PortableRoot 'downloads') "$PortableNodeName.zip"
$PortableNodeUrl = "https://nodejs.org/dist/v$PortableNodeVersion/$PortableNodeName.zip"
$PortableNodeMirrorUrl = "https://npmmirror.com/mirrors/node/v$PortableNodeVersion/$PortableNodeName.zip"
$PortableNodeSha256 = 'edaca9bd58ec8e92037dac4e877d52f6b8f430b81c18b57e264b4e2fb111cd56'

function Write-Section {
    param([string]$Title)
    Write-Host ''
    Write-Host "== $Title ==" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Gray
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Assert-Path {
    param(
        [string]$Path,
        [string]$Hint
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Hint not found: $Path"
    }
}

function Test-NodeExecutable {
    param([string]$NodePath)

    if (-not (Test-Path -LiteralPath $NodePath)) {
        return $false
    }

    try {
        $version = & $NodePath -v 2>$null
        if ($LASTEXITCODE -ne 0 -or -not $version) {
            return $false
        }

        $probe = & $NodePath -e "console.log('vgene-node-ok')" 2>$null
        if ($LASTEXITCODE -ne 0 -or $probe -ne 'vgene-node-ok') {
            Write-Warn "Node candidate cannot execute JS: $NodePath"
            return $false
        }

        return $true
    } catch {
        Write-Warn "Node candidate failed: $NodePath"
        return $false
    }
}

function Resolve-Node {
    $candidates = @()

    if ($env:VGENE_NODE) {
        $candidates += $env:VGENE_NODE
    }

    $candidates += $PortableNodeExe
    $candidates += 'C:\Users\Gene\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    $candidates += 'C:\Program Files\nodejs\node.exe'

    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) {
        $candidates += $cmd.Source
    }

    foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
        if (Test-NodeExecutable -NodePath $candidate) {
            $version = & $candidate -v 2>$null
            Write-Info "Using Node: $candidate ($version)"
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw 'No usable node.exe found. Set VGENE_NODE to a valid node.exe path.'
}

function Invoke-ProcessChecked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory = $RepoRoot
    )

    $display = "$FilePath $($Arguments -join ' ')"
    Write-Host "> $display" -ForegroundColor DarkGray

    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        $exit = $LASTEXITCODE
        if ($exit -ne 0) {
            throw "Command failed with exit code $exit`: $display"
        }
    } finally {
        Pop-Location
    }
}

function Invoke-WingetNodeRepair {
    param([string]$WingetPath)

    $arguments = @(
        'upgrade',
        '--id', 'OpenJS.NodeJS.LTS',
        '--accept-source-agreements',
        '--accept-package-agreements',
        '--silent',
        '--disable-interactivity'
    )
    $timeoutSeconds = 120
    $beforeMsiIds = @(Get-Process msiexec -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
    $argumentLine = ($arguments | ForEach-Object {
        if ($_ -match '\s') {
            '"' + ($_ -replace '"', '\"') + '"'
        } else {
            $_
        }
    }) -join ' '

    Write-Host "> $WingetPath $argumentLine" -ForegroundColor DarkGray
    $process = Start-Process -FilePath $WingetPath -ArgumentList $argumentLine -WorkingDirectory $RepoRoot -PassThru -NoNewWindow
    if (-not $process.WaitForExit($timeoutSeconds * 1000)) {
        Write-Warn "winget did not finish within $timeoutSeconds seconds. Stopping this repair attempt."
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue

        $newMsi = Get-Process msiexec -ErrorAction SilentlyContinue | Where-Object { $beforeMsiIds -notcontains $_.Id }
        foreach ($msi in $newMsi) {
            Write-Warn "Stopping installer process PID=$($msi.Id)"
            Stop-Process -Id $msi.Id -Force -ErrorAction SilentlyContinue
        }

        throw 'winget Node.js repair timed out.'
    }

    if ($process.ExitCode -ne 0) {
        throw "winget Node.js repair failed with exit code $($process.ExitCode)."
    }
}

function Test-GlobalNpm {
    try {
        $npmVersion = & npm -v 2>$null
        if ($LASTEXITCODE -ne 0 -or -not $npmVersion) {
            return $false
        }

        $nodeProbe = & node -e "console.log('global-node-ok')" 2>$null
        if ($LASTEXITCODE -ne 0 -or $nodeProbe -ne 'global-node-ok') {
            return $false
        }

        return $true
    } catch {
        return $false
    }
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-PortableNode {
    Write-Section 'Install portable Node.js fallback'

    if (Test-NodeExecutable -NodePath $PortableNodeExe) {
        $version = & $PortableNodeExe -v
        Write-Ok "Portable Node already usable: $PortableNodeExe ($version)"
        return
    }

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $PortableNodeZip) | Out-Null
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $PortableNodeDir) | Out-Null

    $needsDownload = $true
    if (Test-Path -LiteralPath $PortableNodeZip) {
        $existingHash = (Get-FileHash -LiteralPath $PortableNodeZip -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($existingHash -eq $PortableNodeSha256) {
            $needsDownload = $false
            Write-Info "Using cached Node zip: $PortableNodeZip"
        } else {
            Write-Warn "Cached Node zip checksum mismatch. Re-downloading."
            Remove-Item -LiteralPath $PortableNodeZip -Force
        }
    }

    if ($needsDownload) {
        Save-NodeZip
    }

    $actualHash = (Get-FileHash -LiteralPath $PortableNodeZip -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $PortableNodeSha256) {
        throw "Portable Node checksum mismatch. Expected $PortableNodeSha256, got $actualHash"
    }

    $extractRoot = Join-Path $PortableRoot 'node'
    $tempExtract = Join-Path $extractRoot "$PortableNodeName.tmp"
    if (Test-Path -LiteralPath $tempExtract) {
        Remove-Item -LiteralPath $tempExtract -Recurse -Force
    }

    Expand-Archive -LiteralPath $PortableNodeZip -DestinationPath $extractRoot -Force
    if (-not (Test-NodeExecutable -NodePath $PortableNodeExe)) {
        throw "Portable Node installed but failed validation: $PortableNodeExe"
    }

    $npmCli = Join-Path $PortableNodeDir 'node_modules\npm\bin\npm-cli.js'
    Assert-Path $npmCli 'Portable npm CLI'
    & $PortableNodeExe $npmCli -v | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw 'Portable npm validation failed.'
    }

    Write-Ok "Portable Node installed: $PortableNodeDir"
    Write-Info "For this session, use: `$env:VGENE_NODE='$PortableNodeExe'"
}

function Save-NodeZip {
    $urls = @($PortableNodeUrl, $PortableNodeMirrorUrl)
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue

    foreach ($url in $urls) {
        Write-Info "Downloading $url"

        if ($curl) {
            & $curl.Source -L --fail --connect-timeout 20 --max-time 90 --speed-time 20 --speed-limit 1024 --retry 1 --retry-delay 3 -C - -o $PortableNodeZip $url
            if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $PortableNodeZip)) {
                $hash = (Get-FileHash -LiteralPath $PortableNodeZip -Algorithm SHA256).Hash.ToLowerInvariant()
                if ($hash -eq $PortableNodeSha256) {
                    Write-Ok "Downloaded and verified: $PortableNodeZip"
                    return
                }
                Write-Warn "Checksum mismatch from $url. Removing partial file."
                Remove-Item -LiteralPath $PortableNodeZip -Force -ErrorAction SilentlyContinue
            } else {
                Write-Warn "curl download failed from $url"
            }

            continue
        }

        try {
            Invoke-WebRequest -Uri $url -OutFile $PortableNodeZip -UseBasicParsing -TimeoutSec 90
            $hash = (Get-FileHash -LiteralPath $PortableNodeZip -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($hash -eq $PortableNodeSha256) {
                Write-Ok "Downloaded and verified: $PortableNodeZip"
                return
            }
            Write-Warn "Checksum mismatch from $url. Removing partial file."
            Remove-Item -LiteralPath $PortableNodeZip -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Warn "Download failed from $url`: $($_.Exception.Message)"
        }
    }

    throw 'Unable to download portable Node.js from official source or npmmirror.'
}

function Invoke-NodeScript {
    param(
        [string]$ScriptPath,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory = $RepoRoot
    )

    $node = Resolve-Node
    Assert-Path $ScriptPath 'Node script'
    Invoke-ProcessChecked -FilePath $node -Arguments (@($ScriptPath) + $Arguments) -WorkingDirectory $WorkingDirectory
}

function Get-ProcessExecutablePath {
    param([int]$ProcessId)

    $process = $null
    try {
        $process = Get-Process -Id $ProcessId -ErrorAction Stop
    } catch {
        $process = $null
    }

    if ($process -and $process.Path) {
        return $process.Path
    }

    try {
        $cim = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
        return $cim.ExecutablePath
    } catch {
        return $null
    }
}

function Test-ProjectProcess {
    param([int]$ProcessId)

    $processPath = Get-ProcessExecutablePath -ProcessId $ProcessId
    if ($processPath -and $processPath.StartsWith($RepoRoot, [StringComparison]::OrdinalIgnoreCase)) {
        return $true
    }

    try {
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop).CommandLine
        return $cmd -and $cmd.IndexOf($RepoRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0
    } catch {
        return $false
    }
}

function Stop-AppProcesses {
    Write-Section 'Stop running VGene processes'

    Stop-ReleaseExecutables

    $portOwners = @(Get-NetTCPConnection -LocalPort $DevPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($ownerPid in $portOwners) {
        if (-not $ownerPid) {
            continue
        }

        try {
            $proc = Get-Process -Id $ownerPid -ErrorAction Stop
            if (-not (Test-ProjectProcess -ProcessId $ownerPid)) {
                Write-Warn "Skipping port $DevPort owner outside this repo: $($proc.ProcessName) PID=$ownerPid"
                continue
            }

            Write-Info "Stopping port $DevPort owner $($proc.ProcessName) PID=$ownerPid"
            Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Warn "Unable to inspect process PID=$ownerPid"
        }
    }

    Get-Process node -ErrorAction SilentlyContinue | Where-Object {
        try {
            $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
            $cmd -and $cmd.IndexOf($RepoRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0
        } catch {
            $false
        }
    } | ForEach-Object {
        Write-Info "Stopping project node process PID=$($_.Id)"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Milliseconds 500
    Write-Ok 'Stop complete'
}

function Stop-ReleaseExecutables {
    Get-Process -Name $AppProcessName -ErrorAction SilentlyContinue | ForEach-Object {
        if (Test-ProjectProcess -ProcessId $_.Id) {
            Write-Info "Stopping $($_.ProcessName) PID=$($_.Id)"
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        } else {
            Write-Warn "Skipping $($_.ProcessName) outside this repo PID=$($_.Id)"
        }
    }
}

function Invoke-FrontendCheck {
    Write-Section 'TypeScript check'
    Invoke-NodeScript -ScriptPath (Join-Path $RepoRoot 'node_modules\typescript\bin\tsc') -Arguments @('--noEmit')
}

function Invoke-FrontendBuild {
    Write-Section 'Vite build'
    Invoke-NodeScript -ScriptPath (Join-Path $RepoRoot 'node_modules\vite\bin\vite.js') -Arguments @('build')
}

function Invoke-CargoCheck {
    Write-Section 'Cargo check'
    Invoke-ProcessChecked -FilePath 'cargo' -Arguments @('check') -WorkingDirectory $TauriRoot
}

function Invoke-TauriBuild {
    Write-Section 'Tauri release build'
    Stop-ReleaseExecutables
    $config = '{"build":{"beforeBuildCommand":""}}'
    Invoke-NodeScript -ScriptPath (Join-Path $RepoRoot 'node_modules\@tauri-apps\cli\tauri.js') -Arguments @('build', '--config', $config)
    Assert-Path $ReleaseExe 'Release executable'
    Write-Ok "Built: $ReleaseExe"
}

function Invoke-BuildCheck {
    Invoke-FrontendCheck
    Invoke-FrontendBuild
    Invoke-CargoCheck
    Write-Ok 'Build check passed'
}

function Invoke-ReleaseBuild {
    Invoke-FrontendBuild
    Invoke-TauriBuild
}

function Start-ReleaseExe {
    Assert-Path $ReleaseExe 'Release executable'
    Write-Section 'Start release executable'

    $process = Start-Process -FilePath $ReleaseExe -WorkingDirectory $TauriRoot -PassThru
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 300
        $process.Refresh()

        if ($process.HasExited) {
            throw "Release executable exited early with code $($process.ExitCode). Check $RuntimeLog"
        }

        if ($process.MainWindowHandle -ne 0) {
            Write-Ok "Running PID=$($process.Id) Window='$($process.MainWindowTitle)'"
            return
        }
    }

    Write-Warn "Process started PID=$($process.Id), but no main window was detected yet."
}

function Invoke-RunRelease {
    Stop-AppProcesses
    Invoke-ReleaseBuild
    Start-ReleaseExe
}

function Invoke-LaunchRelease {
    Stop-AppProcesses
    Start-ReleaseExe
}

function Invoke-SmartRun {
    if (Test-Path -LiteralPath $ReleaseExe) {
        Invoke-LaunchRelease
        return
    }

    Write-Warn 'Release executable is missing. Building once before launch.'
    Invoke-RunRelease
}

function Wait-DevServer {
    $url = "http://127.0.0.1:$DevPort"
    Write-Info "Waiting for $url"

    for ($i = 0; $i -lt 60; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                Write-Ok "Dev server ready: $url"
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "Timed out waiting for dev server: $url"
}

function Invoke-DevMode {
    Stop-AppProcesses

    Write-Section 'Start Vite dev server'
    $node = Resolve-Node
    $vite = Join-Path $RepoRoot 'node_modules\vite\bin\vite.js'
    Assert-Path $vite 'Vite CLI'
    $viteArgs = @($vite, '--host', '127.0.0.1', '--port', "$DevPort", '--strictPort')
    $viteProcess = Start-Process -FilePath $node -ArgumentList $viteArgs -WorkingDirectory $RepoRoot -PassThru -WindowStyle Hidden
    Write-Info "Vite PID=$($viteProcess.Id)"
    Wait-DevServer

    Write-Section 'Start Tauri dev'
    $tauri = Join-Path $RepoRoot 'node_modules\@tauri-apps\cli\tauri.js'
    Assert-Path $tauri 'Tauri CLI'
    $config = '{"build":{"beforeDevCommand":""}}'
    Invoke-ProcessChecked -FilePath $node -Arguments @($tauri, 'dev', '--config', $config) -WorkingDirectory $RepoRoot
}

function Show-CommandLocations {
    param([string]$Name)
    Write-Host "`n[$Name locations]" -ForegroundColor DarkCyan
    try {
        where.exe $Name 2>$null | ForEach-Object { Write-Host $_ }
    } catch {
        Write-Warn "where.exe $Name failed"
    }
}

function Invoke-NpmDiagnostics {
    Write-Section 'Node/npm diagnostics'
    foreach ($name in @('node', 'npm', 'npx', 'corepack')) {
        Show-CommandLocations -Name $name
    }

    Write-Host "`n[PowerShell command resolution]" -ForegroundColor DarkCyan
    Get-Command node, npm, npx -All -ErrorAction SilentlyContinue | Select-Object CommandType, Source, Version | Format-Table -AutoSize

    Write-Host "`n[PATH entries containing node/npm/trae/codex]" -ForegroundColor DarkCyan
    $env:PATH -split ';' | Where-Object { $_ -match 'node|npm|trae|codex' } | ForEach-Object {
        $exists = Test-Path -LiteralPath $_
        if ($exists) {
            Write-Host "[OK] $_"
        } else {
            Write-Host "[MISSING] $_" -ForegroundColor Yellow
        }
    }

    Write-Host "`n[npm -v]" -ForegroundColor DarkCyan
    try {
        & npm -v
        Write-Host "LASTEXIT=$LASTEXITCODE"
    } catch {
        Write-Warn $_.Exception.Message
    }

    $npmCli = 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'
    $programFilesNode = 'C:\Program Files\nodejs\node.exe'
    Write-Host "`n[npm-cli.js -v]" -ForegroundColor DarkCyan
    if ((Test-Path -LiteralPath $programFilesNode) -and (Test-Path -LiteralPath $npmCli)) {
        try {
            & $programFilesNode $npmCli -v
            Write-Host "LASTEXIT=$LASTEXITCODE"
        } catch {
            Write-Warn $_.Exception.Message
        }
    } else {
        Write-Warn 'Program Files Node/npm CLI path is missing.'
    }

    Write-Host "`n[Program Files node JS probe]" -ForegroundColor DarkCyan
    $programFilesNode = 'C:\Program Files\nodejs\node.exe'
    if (Test-Path -LiteralPath $programFilesNode) {
        & $programFilesNode -e "console.log('pf-node-ok')" 2>$null
        Write-Host "LASTEXIT=$LASTEXITCODE"
    }

    Write-Host "`n[Portable node path]" -ForegroundColor DarkCyan
    Write-Host $PortableNodeExe
    if (Test-Path -LiteralPath $PortableNodeExe) {
        & $PortableNodeExe -v
        Write-Host "LASTEXIT=$LASTEXITCODE"
    }
}

function Update-SessionPath {
    Write-Section 'Reload PATH for current session'
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:PATH = @($machinePath, $userPath) -join ';'
    Write-Ok 'PATH reloaded from Machine/User environment.'
}

function Remove-StaleNodePathEntries {
    Write-Section 'Clean stale Node PATH entries'
    foreach ($scope in @('User', 'Machine')) {
        $pathValue = [Environment]::GetEnvironmentVariable('Path', $scope)
        if (-not $pathValue) {
            Write-Info "$scope PATH is empty."
            continue
        }

        $entries = @($pathValue -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        $kept = New-Object System.Collections.Generic.List[string]
        $removed = New-Object System.Collections.Generic.List[string]

        foreach ($entry in $entries) {
            $isStaleNodePath = ($entry -match '\\.trae\\binaries\\node\\versions' -or $entry -match '\\node\\versions') -and -not (Test-Path -LiteralPath $entry)
            if ($isStaleNodePath) {
                $removed.Add($entry)
            } else {
                $kept.Add($entry)
            }
        }

        if ($removed.Count -eq 0) {
            Write-Ok "No stale $scope Node PATH entries found."
            continue
        }

        if ($scope -eq 'Machine' -and -not (Test-IsAdministrator)) {
            foreach ($entry in $removed) {
                Write-Warn "Stale Machine PATH entry requires Administrator to remove: $entry"
            }
            continue
        }

        try {
            [Environment]::SetEnvironmentVariable('Path', ($kept -join ';'), $scope)
            foreach ($entry in $removed) {
                Write-Warn "Removed stale $scope PATH entry: $entry"
            }
        } catch {
            Write-Warn "Could not update $scope PATH: $($_.Exception.Message)"
        }
    }
}

function Invoke-RepairNpm {
    Invoke-NpmDiagnostics
    Remove-StaleNodePathEntries

    if (-not (Test-GlobalNpm)) {
        Write-Warn 'Global Node/npm is still unhealthy. Installing portable fallback without administrator permissions.'
        try {
            Install-PortableNode
        } catch {
            Write-Warn "Portable Node install failed: $($_.Exception.Message)"
        }
    }

    Write-Section 'Repair global Node/npm with winget'
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Warn 'winget is not available. Install or repair Node.js manually, then rerun this script.'
    } elseif ($env:VGENE_REPAIR_GLOBAL_NODE -ne '1') {
        Write-Warn 'Skipping automatic global Node.js MSI repair to avoid installer hangs.'
        Write-Warn 'Portable Node/npm fallback is enough for this project.'
        Write-Warn 'To force global repair from an elevated PowerShell, run:'
        Write-Warn '$env:VGENE_REPAIR_GLOBAL_NODE=1; .\run.ps1 -Action RepairNpm'
        Write-Warn 'Manual commands:'
        Write-Warn 'winget uninstall --id OpenJS.NodeJS.LTS --accept-source-agreements'
        Write-Warn 'winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent'
    } elseif (-not (Test-IsAdministrator)) {
        Write-Warn 'Current PowerShell is not elevated. Skipping global Node.js MSI repair to avoid installer hangs.'
        Write-Warn 'Open PowerShell as Administrator and run:'
        Write-Warn 'winget uninstall --id OpenJS.NodeJS.LTS --accept-source-agreements'
        Write-Warn 'winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent'
    } else {
        try {
            Invoke-WingetNodeRepair -WingetPath $winget.Source
        } catch {
            Write-Warn "winget upgrade failed: $($_.Exception.Message)"
            Write-Warn 'Manual fallback: uninstall Node.js from Apps, then install Node.js LTS again.'
        }
    }

    Update-SessionPath

    Write-Section 'Post-repair validation'
    foreach ($cmd in @('node', 'npm', 'npx', 'corepack')) {
        Write-Host "`n[$cmd version]" -ForegroundColor DarkCyan
        try {
            & $cmd --version
            Write-Host "LASTEXIT=$LASTEXITCODE"
        } catch {
            Write-Warn $_.Exception.Message
        }
    }

    if (Test-NodeExecutable -NodePath $PortableNodeExe) {
        Write-Ok "Portable Node fallback is healthy: $PortableNodeExe"
    }

    Write-Info 'Project builds remain available through the portable/Codex Node fallback even if global npm is still broken.'
}

function Open-OutputFolder {
    Write-Section 'Open output folders'
    $opened = $false
    if (Test-Path -LiteralPath $ReleaseDir) {
        Start-Process explorer.exe $ReleaseDir
        Write-Ok "Opened: $ReleaseDir"
        $opened = $true
    }
    if (Test-Path -LiteralPath $BundleDir) {
        Start-Process explorer.exe $BundleDir
        Write-Ok "Opened: $BundleDir"
        $opened = $true
    }

    if (-not $opened) {
        Write-Warn 'No release output folders found yet. Run Build first.'
    }
}

function Invoke-MenuStep {
    param([scriptblock]$Step)

    try {
        & $Step
    } catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ''
    Read-Host '按 Enter 返回菜单' | Out-Null
}

function Show-Menu {
    while ($true) {
        Write-Host ''
        Write-Host 'VGene One-Key Runner' -ForegroundColor Cyan
        Write-Host '[1] Launch EXE now  (default; build only if missing)'
        Write-Host '[2] Stop + Build + Run EXE'
        Write-Host '[3] Build Check'
        Write-Host '[4] Build Release Only'
        Write-Host '[5] Dev Mode'
        Write-Host '[6] Stop All'
        Write-Host '[7] Repair/Diagnose npm'
        Write-Host '[8] Open Output Folder'
        Write-Host '[0] Exit'
        $choice = Read-Host 'Select'

        if ([string]::IsNullOrWhiteSpace($choice)) {
            $choice = '1'
        }

        switch ($choice) {
            '1' { Invoke-MenuStep { Invoke-SmartRun } }
            '2' { Invoke-MenuStep { Invoke-RunRelease } }
            '3' { Invoke-MenuStep { Invoke-BuildCheck } }
            '4' { Invoke-MenuStep { Invoke-ReleaseBuild } }
            '5' { Invoke-MenuStep { Invoke-DevMode } }
            '6' { Invoke-MenuStep { Stop-AppProcesses } }
            '7' { Invoke-MenuStep { Invoke-RepairNpm } }
            '8' { Invoke-MenuStep { Open-OutputFolder } }
            '0' { return }
            default { Write-Warn 'Invalid choice.' }
        }
    }
}

$exitCode = 0
Push-Location $RepoRoot
try {
    switch ($Action) {
        'Menu' { Show-Menu }
        'Launch' { Invoke-LaunchRelease }
        'Run' { Invoke-RunRelease }
        'Check' { Invoke-BuildCheck }
        'Build' { Invoke-ReleaseBuild }
        'Dev' { Invoke-DevMode }
        'Stop' { Stop-AppProcesses }
        'RepairNpm' { Invoke-RepairNpm }
        'OpenOutput' { Open-OutputFolder }
    }
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
} finally {
    Pop-Location
}

exit $exitCode
