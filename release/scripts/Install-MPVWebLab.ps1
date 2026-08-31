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
if (-not (Test-Path -LiteralPath (Join-Path $payloadRoot 'mpvnet.exe') -PathType Leaf)) {
    throw "Package payload is missing or invalid: $payloadRoot"
}
if ($InstallRoot.StartsWith(($payloadRoot.TrimEnd('\') + '\'), [System.StringComparison]::OrdinalIgnoreCase) -or
    $payloadRoot.StartsWith(($InstallRoot.TrimEnd('\') + '\'), [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'InstallRoot and package payload must be separate directories.'
}

$version = (Get-Content -LiteralPath (Join-Path $PackageRoot 'VERSION') -Raw).Trim()
if ($PSCmdlet.ShouldProcess($InstallRoot, "install MPV WebLab $version")) {
    New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
    Invoke-MPVWebLabRobocopy -Source $payloadRoot -Destination $InstallRoot
    Set-MPVWebLabRuntimeConfiguration `
        -InstallRoot $InstallRoot `
        -Version $version `
        -ProxyUrl $ProxyUrl `
        -TimeshiftCacheRoot $TimeshiftCacheRoot

    $maintenanceRoot = Join-Path $InstallRoot 'maintenance'
    Invoke-MPVWebLabRobocopy -Source $PSScriptRoot -Destination (Join-Path $maintenanceRoot 'installer')
    Invoke-MPVWebLabRobocopy -Source (Join-Path $PackageRoot 'docs') -Destination (Join-Path $maintenanceRoot 'docs')
    Invoke-MPVWebLabRobocopy -Source (Join-Path $PackageRoot 'LICENSES') -Destination (Join-Path $maintenanceRoot 'LICENSES')
    Copy-Item -LiteralPath (Join-Path $PackageRoot 'VERSION') -Destination (Join-Path $maintenanceRoot 'VERSION') -Force

    if (-not $SkipRegistration) {
        Register-MPVWebLab -InstallRoot $InstallRoot
    }
    Test-MPVWebLabInstall -InstallRoot $InstallRoot -SkipRegistry:$SkipRegistration | Out-Null
}

Write-Host "MPV WebLab $version is installed at: $InstallRoot" -ForegroundColor Green
Write-Host 'Next: load the browser extension and install the userscript as described in maintenance\docs.'

