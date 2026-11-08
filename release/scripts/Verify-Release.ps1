[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $PackageRoot,
    [string] $ManifestPath = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$commonPath = Join-Path $PSScriptRoot 'MPVWebLab.Common.ps1'
. $commonPath

$PackageRoot = Resolve-MPVWebLabPath -Path $PackageRoot
if (-not (Test-Path -LiteralPath $PackageRoot -PathType Container)) {
    throw "Release package directory is missing: $PackageRoot"
}
if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
    $ManifestPath = Join-Path $PackageRoot 'release-manifest.json'
}

$requiredFiles = @(
    'VERSION',
    'README.md',
    'payload\mpvnet.exe',
    'payload\weblab.ico',
    'payload\COPYING',
    'payload\yt-dlp.exe',
    'payload\ffmpeg\ffmpeg.exe',
    'payload\portable_config\mpv.conf',
    'payload\url-scheme-handler-lab\url-scheme-handler-lab.exe',
    'payload\youtube-cookie-native-host\mpv-weblab-youtube-cookie-host.exe',
    'payload\yt-dlp-weblab-wrapper\yt-dlp-weblab-wrapper.exe',
    'payload\weblab-cookie-extension\manifest.json',
    'payload\external-player-weblab-safe.user.js',
    'installer\Install-MPVWebLab.ps1',
    'installer\Update-MPVWebLab.ps1',
    'installer\Uninstall-MPVWebLab.ps1',
    'installer\Test-MPVWebLab.ps1',
    'LICENSES\THIRD_PARTY_NOTICES.md'
)
foreach ($relative in $requiredFiles) {
    $path = Join-Path $PackageRoot $relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Release is missing a required file: $relative"
    }
}
$extensionRoot = Join-Path $PackageRoot 'payload\weblab-cookie-extension'
$extensionManifest = [System.IO.File]::ReadAllText((Join-Path $extensionRoot 'manifest.json')) | ConvertFrom-Json
foreach ($iconMap in @($extensionManifest.icons, $extensionManifest.action.default_icon)) {
    if ($null -eq $iconMap -or @($iconMap.PSObject.Properties).Count -eq 0) {
        throw 'Release extension is missing its icon declarations.'
    }
    foreach ($entry in $iconMap.PSObject.Properties) {
        $iconPath = Resolve-MPVWebLabPath -Path ([string] $entry.Value) -BasePath $extensionRoot
        if (-not $iconPath.StartsWith($extensionRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
            -not (Test-Path -LiteralPath $iconPath -PathType Leaf)) {
            throw "Release extension icon is missing or outside its directory: $($entry.Value)"
        }
        $bytes = [System.IO.File]::ReadAllBytes($iconPath)
        if ($bytes.Length -lt 24 -or [Convert]::ToBase64String($bytes[0..7]) -ne 'iVBORw0KGgo=') {
            throw "Release extension icon is not a PNG: $($entry.Value)"
        }
        $width = [uint32] $bytes[16] * 16777216 + [uint32] $bytes[17] * 65536 + [uint32] $bytes[18] * 256 + $bytes[19]
        $height = [uint32] $bytes[20] * 16777216 + [uint32] $bytes[21] * 65536 + [uint32] $bytes[22] * 256 + $bytes[23]
        if ($width -ne [int] $entry.Name -or $height -ne [int] $entry.Name) {
            throw "Release extension icon dimensions do not match $($entry.Name): $($entry.Value)"
        }
    }
}
$documentationFiles = @(Get-ChildItem -LiteralPath (Join-Path $PackageRoot 'docs') -Filter '*.md' -File)
if ($documentationFiles.Count -lt 6) {
    throw "Release documentation is incomplete: expected at least 6 files, found $($documentationFiles.Count)."
}

$forbiddenPathPatterns = @(
    '(^|[\\/])credentials([\\/]|$)',
    '(^|[\\/])cache([\\/]|$)',
    '(^|[\\/])temp([\\/]|$)',
    '(^|[\\/])watch_later([\\/]|$)',
    '(^|[\\/])argv-recorder\.exe$',
    '(^|[\\/])bilibili-cookies\.txt$',
    '(^|[\\/])youtube-cookies\.txt$',
    '\.(log|pdb|tmp|bak|lock)$',
    '(^|[\\/])[^\\/]*-cookies\.txt$'
)
$allFiles = @(Get-ChildItem -LiteralPath $PackageRoot -Recurse -File)
$payloadFiles = @(Get-ChildItem -LiteralPath (Join-Path $PackageRoot 'payload') -Recurse -File)
foreach ($file in $allFiles) {
    $relative = (Get-MPVWebLabRelativePath -BasePath $PackageRoot -TargetPath $file.FullName).Replace('\', '/')
    foreach ($pattern in $forbiddenPathPatterns) {
        if ($relative -match $pattern) {
            throw "Release contains a forbidden file: $relative"
        }
    }
}

$textExtensions = @(
    '.bat', '.cmd', '.conf', '.config', '.ini', '.json', '.lua', '.md',
    '.ps1', '.txt', '.xml'
)
$forbiddenContentPatterns = @(
    '(?i)[A-Z]:\\Users\\[^\\\r\n]+\\',
    '(?i)D:\\Apps\\MPV-WebLab',
    '(?i)E:\\\.mpv-bilibili-timeshift'
)
foreach ($file in $payloadFiles) {
    if ($textExtensions -notcontains $file.Extension.ToLowerInvariant()) {
        continue
    }
    $content = [System.IO.File]::ReadAllText($file.FullName)
    foreach ($pattern in $forbiddenContentPatterns) {
        if ($content -match $pattern) {
            $relative = Get-MPVWebLabRelativePath -BasePath $PackageRoot -TargetPath $file.FullName
            throw "Release contains a machine-specific path in: $relative"
        }
    }
}

$settingsPath = Join-Path $PackageRoot 'payload\portable_config\settings.xml'
if (Test-Path -LiteralPath $settingsPath -PathType Leaf) {
    [xml] $settings = [System.IO.File]::ReadAllText($settingsPath)
    $recentFiles = @($settings.SelectNodes('/AppSettings/RecentFiles/string'))
    if ($recentFiles.Count -gt 0) {
        throw 'MPV.NET recent file history was not removed from settings.xml.'
    }
}

$extensionManifestPath = Join-Path $PackageRoot 'payload\weblab-cookie-extension\manifest.json'
$extensionId = Get-MPVWebLabExtensionId -ManifestPath $extensionManifestPath
if ($extensionId -ne 'mkfocliccanidollbpnmaedkbmadjdai') {
    throw "Unexpected browser extension ID: $extensionId"
}

if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
    throw "Release manifest is missing: $ManifestPath"
}
$manifest = [System.IO.File]::ReadAllText($ManifestPath) | ConvertFrom-Json
foreach ($entry in $manifest.files) {
    $relative = ([string] $entry.path).Replace('/', '\')
    $path = Join-Path $PackageRoot $relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Manifest references a missing file: $relative"
    }
    $actual = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne ([string] $entry.sha256).ToLowerInvariant()) {
        throw "Manifest hash mismatch: $relative"
    }
    if ((Get-Item -LiteralPath $path).Length -ne [long] $entry.size) {
        throw "Manifest size mismatch: $relative"
    }
}

$expectedManifestEntries = @($allFiles | Where-Object { $_.FullName -ne (Resolve-MPVWebLabPath -Path $ManifestPath) })
if (@($manifest.files).Count -ne $expectedManifestEntries.Count) {
    throw "Manifest file count does not match package contents. Manifest=$(@($manifest.files).Count), package=$($expectedManifestEntries.Count)."
}

Write-Host "Release verification passed: $($allFiles.Count) files, extension ID $extensionId." -ForegroundColor Green
