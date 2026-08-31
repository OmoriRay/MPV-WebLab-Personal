[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param(
    [string] $InstallRoot = '',
    [switch] $RemoveFiles,
    [switch] $RemoveUserData
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'MPVWebLab.Common.ps1')

if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
    $InstallRoot = Get-MPVWebLabDefaultInstallRoot
}
$InstallRoot = Resolve-MPVWebLabPath -Path $InstallRoot
Unregister-MPVWebLab -InstallRoot $InstallRoot

if ($RemoveFiles) {
    if ($InstallRoot.Length -lt 8 -or -not (Test-Path -LiteralPath (Join-Path $InstallRoot 'install-state.json') -PathType Leaf)) {
        throw "Refusing to delete an unrecognized installation directory: $InstallRoot"
    }
    if (-not $RemoveUserData) {
        throw 'For safety, file deletion requires -RemoveUserData. Without it, only registrations are removed.'
    }
    if ($PSCmdlet.ShouldProcess($InstallRoot, 'delete MPV WebLab including credentials, cache and playback history')) {
        Remove-Item -LiteralPath $InstallRoot -Recurse -Force
    }
}

Write-Host 'MPV WebLab registrations were removed.' -ForegroundColor Green
if (-not $RemoveFiles) {
    Write-Host "Program files and private data were kept at: $InstallRoot"
}

