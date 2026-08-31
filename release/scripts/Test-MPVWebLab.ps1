[CmdletBinding()]
param(
    [string] $InstallRoot = '',
    [switch] $SkipRegistry
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'MPVWebLab.Common.ps1')

if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
    $InstallRoot = Get-MPVWebLabDefaultInstallRoot
}
Test-MPVWebLabInstall -InstallRoot $InstallRoot -SkipRegistry:$SkipRegistry | Out-Null
Write-Host 'MPV WebLab installation verification passed.' -ForegroundColor Green

