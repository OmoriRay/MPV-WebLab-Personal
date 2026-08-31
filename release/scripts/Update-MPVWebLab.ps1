[CmdletBinding(SupportsShouldProcess)]
param(
    [string] $PackageRoot = '',
    [string] $InstallRoot = '',
    [AllowEmptyString()]
    [string] $ProxyUrl = '__PRESERVE__',
    [string] $TimeshiftCacheRoot = '',
    [switch] $SkipRegistration
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'MPVWebLab.Common.ps1')

if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
    $PackageRoot = Split-Path -Parent $PSScriptRoot
}
$PackageRoot = Resolve-MPVWebLabPath -Path $PackageRoot
if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
    $InstallRoot = Get-MPVWebLabDefaultInstallRoot
}
$InstallRoot = Resolve-MPVWebLabPath -Path $InstallRoot
$payloadRoot = Join-Path $PackageRoot 'payload'
if (-not (Test-Path -LiteralPath (Join-Path $InstallRoot 'install-state.json') -PathType Leaf)) {
    throw "Existing installation state is missing. Run Install-MPVWebLab.ps1 first: $InstallRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $payloadRoot 'mpvnet.exe') -PathType Leaf)) {
    throw "Update package payload is missing: $payloadRoot"
}
$existingState = [System.IO.File]::ReadAllText((Join-Path $InstallRoot 'install-state.json')) | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($TimeshiftCacheRoot) -and $existingState.timeshiftCacheRoot) {
    $TimeshiftCacheRoot = [string] $existingState.timeshiftCacheRoot
}

$runningFromInstall = @(Get-Process -Name 'mpvnet' -ErrorAction SilentlyContinue | Where-Object {
    try { $_.Path -and $_.Path.StartsWith($InstallRoot, [System.StringComparison]::OrdinalIgnoreCase) } catch { $false }
})
if ($runningFromInstall.Count -gt 0) {
    throw 'MPV.NET is still running from this installation. Close it before updating.'
}

$version = (Get-Content -LiteralPath (Join-Path $PackageRoot 'VERSION') -Raw).Trim()
$backupRoot = "$InstallRoot.update-backup-$([Guid]::NewGuid().ToString('N'))"
$preservedPaths = @(
    'credentials',
    'cache',
    'portable_config\watch_later',
    'portable_config\persistent_config.json',
    'portable_config\script-opts\bilibili_danmaku_state.json',
    'portable_config\script-opts\weblab-download-folder.conf'
)

if ($PSCmdlet.ShouldProcess($InstallRoot, "update MPV WebLab to $version")) {
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    try {
        foreach ($relative in $preservedPaths) {
            $source = Join-Path $InstallRoot $relative
            $destination = Join-Path $backupRoot $relative
            if (Test-Path -LiteralPath $source -PathType Container) {
                Invoke-MPVWebLabRobocopy -Source $source -Destination $destination
            } elseif (Test-Path -LiteralPath $source -PathType Leaf) {
                New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
                Copy-Item -LiteralPath $source -Destination $destination -Force
            }
        }

        Invoke-MPVWebLabRobocopy -Source $payloadRoot -Destination $InstallRoot -Mirror
        foreach ($relative in $preservedPaths) {
            $source = Join-Path $backupRoot $relative
            $destination = Join-Path $InstallRoot $relative
            if (Test-Path -LiteralPath $source -PathType Container) {
                Invoke-MPVWebLabRobocopy -Source $source -Destination $destination
            } elseif (Test-Path -LiteralPath $source -PathType Leaf) {
                New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
                Copy-Item -LiteralPath $source -Destination $destination -Force
            }
        }

        Set-MPVWebLabRuntimeConfiguration `
            -InstallRoot $InstallRoot `
            -Version $version `
            -ProxyUrl $ProxyUrl `
            -TimeshiftCacheRoot $TimeshiftCacheRoot
        if (-not $SkipRegistration) {
            Register-MPVWebLab -InstallRoot $InstallRoot
        }

        $maintenanceRoot = Join-Path $InstallRoot 'maintenance'
        Invoke-MPVWebLabRobocopy -Source $PSScriptRoot -Destination (Join-Path $maintenanceRoot 'installer')
        Invoke-MPVWebLabRobocopy -Source (Join-Path $PackageRoot 'docs') -Destination (Join-Path $maintenanceRoot 'docs')
        Invoke-MPVWebLabRobocopy -Source (Join-Path $PackageRoot 'LICENSES') -Destination (Join-Path $maintenanceRoot 'LICENSES')
        Copy-Item -LiteralPath (Join-Path $PackageRoot 'VERSION') -Destination (Join-Path $maintenanceRoot 'VERSION') -Force

        Test-MPVWebLabInstall -InstallRoot $InstallRoot -SkipRegistry:$SkipRegistration | Out-Null
    } finally {
        if (Test-Path -LiteralPath $backupRoot) {
            Remove-Item -LiteralPath $backupRoot -Recurse -Force
        }
    }
}

Write-Host "MPV WebLab was updated to $version at: $InstallRoot" -ForegroundColor Green
