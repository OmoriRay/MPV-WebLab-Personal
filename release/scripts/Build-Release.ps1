[CmdletBinding()]
param(
    [ValidatePattern('^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$')]
    [string] $Version = '1.0.1',
    [string] $SourceRoot = 'D:\Apps\MPV-WebLab',
    [string] $OutputRoot = '',
    [switch] $SkipArchive,
    [switch] $KeepStaging
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$commonPath = Join-Path $PSScriptRoot 'MPVWebLab.Common.ps1'
. $commonPath

$repositoryRoot = Resolve-MPVWebLabPath -Path '..\..' -BasePath $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Resolve-MPVWebLabPath -Path '..\..\..\release-output' -BasePath $PSScriptRoot
} else {
    $OutputRoot = Resolve-MPVWebLabPath -Path $OutputRoot
}
$SourceRoot = Resolve-MPVWebLabPath -Path $SourceRoot
if (-not (Test-Path -LiteralPath (Join-Path $SourceRoot 'mpvnet.exe') -PathType Leaf)) {
    throw "The source deployment is not a valid MPV WebLab installation: $SourceRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $SourceRoot 'portable_config') -PathType Container)) {
    throw "The source deployment is missing portable_config: $SourceRoot"
}

$packageName = "MPV-WebLab-personal-$Version-win-x64"
$stagingParent = Join-Path $OutputRoot 'staging'
$packageRoot = Join-Path $stagingParent $packageName
New-Item -ItemType Directory -Path $stagingParent -Force | Out-Null
Remove-MPVWebLabSafeDirectory -Parent $stagingParent -Child $packageRoot
New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
$payloadRoot = Join-Path $packageRoot 'payload'
New-Item -ItemType Directory -Path $payloadRoot -Force | Out-Null

$runtimeDirectories = @(
    'ffmpeg',
    'Locale',
    'modes',
    'portable_config',
    'url-scheme-handler-lab',
    'vapoursynth64',
    'weblab-cookie-extension',
    'youtube-cookie-native-host',
    'yt-dlp-weblab-wrapper'
)
$excludedDirectoryNames = @(
    'cache', 'credentials', 'temp', 'watch_later', 'bin', 'obj', 'publish'
)
$excludedFileNames = @(
    '*.bak', '*.log', '*.pdb', '*.tmp', '*.lock', '*-cookies.txt', 'bilibili-cookies.txt',
    'youtube-cookies.txt', 'argv-recorder.exe'
)
foreach ($directory in $runtimeDirectories) {
    $source = Join-Path $SourceRoot $directory
    if (-not (Test-Path -LiteralPath $source -PathType Container)) {
        throw "Required runtime directory is missing: $source"
    }
    Invoke-MPVWebLabRobocopy `
        -Source $source `
        -Destination (Join-Path $payloadRoot $directory) `
        -ExcludeDirectories $excludedDirectoryNames `
        -ExcludeFiles $excludedFileNames
}

$allowedRootExtensions = @(
    '.ax', '.cat', '.com', '.config', '.dll', '.exe', '.in', '.ini', '.manifest',
    '.md', '.py', '.pyd', '.pth', '.txt', '.vs', '.zip'
)
$allowedRootNames = @('COPYING', 'LICENSE', 'LICENSE.txt')
$excludedRootNames = @(
    'register-native-host.ps1',
    'ReShade.log', 'ReShade2.log', 'ReShade3.log', 'ReShade4.log', 'ReShade5.log'
)
foreach ($file in Get-ChildItem -LiteralPath $SourceRoot -File) {
    if ($allowedRootExtensions -notcontains $file.Extension.ToLowerInvariant() -and
        $allowedRootNames -notcontains $file.Name) {
        continue
    }
    if ($excludedRootNames -contains $file.Name -or $file.Name -match '\.(log|pdb|tmp|bak|lock)$|cookies\.txt$') {
        continue
    }
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $payloadRoot $file.Name) -Force
}

$userscriptSource = Join-Path $repositoryRoot 'dist\external-player-weblab-safe-1.5.2.user.js'
if (-not (Test-Path -LiteralPath $userscriptSource -PathType Leaf)) {
    $userscriptSource = Join-Path $SourceRoot 'external-player-weblab-safe.user.js'
}
Copy-Item -LiteralPath $userscriptSource -Destination (Join-Path $payloadRoot 'external-player-weblab-safe.user.js') -Force
$userscriptText = [System.IO.File]::ReadAllText($userscriptSource)
$userscriptVersionMatch = [regex]::Match($userscriptText, '(?m)^//\s*@version\s+([^\s]+)')
$userscriptVersion = if ($userscriptVersionMatch.Success) { $userscriptVersionMatch.Groups[1].Value } else { 'unknown' }
$extensionManifestValue = [System.IO.File]::ReadAllText((Join-Path $payloadRoot 'weblab-cookie-extension\manifest.json')) | ConvertFrom-Json
$extensionVersion = [string] $extensionManifestValue.version

$settingsPath = Join-Path $payloadRoot 'portable_config\settings.xml'
if (Test-Path -LiteralPath $settingsPath -PathType Leaf) {
    $settingsText = [System.IO.File]::ReadAllText($settingsPath)
    $settingsText = [regex]::Replace(
        $settingsText,
        '(?s)<RecentFiles>.*?</RecentFiles>',
        '<RecentFiles />'
    )
    Write-MPVWebLabUtf8Text -Path $settingsPath -Content $settingsText
}

$desktop = Get-MPVWebLabDesktopPath
$userProfile = [Environment]::GetFolderPath('UserProfile')
$timeshift = 'E:\.mpv-bilibili-timeshift'
$tokenMap = [ordered]@{
    $SourceRoot.Replace('\', '\\') = '__MPV_WEBLAB_ROOT_ESCAPED__'
    $SourceRoot.Replace('\', '/') = '__MPV_WEBLAB_ROOT_FORWARD__'
    $SourceRoot = '__MPV_WEBLAB_ROOT__'
    $desktop.Replace('\', '\\') = '__MPV_WEBLAB_DESKTOP_ESCAPED__'
    $desktop.Replace('\', '/') = '__MPV_WEBLAB_DESKTOP_FORWARD__'
    $desktop = '__MPV_WEBLAB_DESKTOP__'
    $userProfile.Replace('\', '\\') = '__MPV_WEBLAB_USERPROFILE_ESCAPED__'
    $userProfile.Replace('\', '/') = '__MPV_WEBLAB_USERPROFILE_FORWARD__'
    $userProfile = '__MPV_WEBLAB_USERPROFILE__'
    $timeshift.Replace('\', '\\') = '__MPV_WEBLAB_TIMESHIFT_ESCAPED__'
    $timeshift.Replace('\', '/') = '__MPV_WEBLAB_TIMESHIFT_FORWARD__'
    $timeshift = '__MPV_WEBLAB_TIMESHIFT__'
}
$textExtensions = @(
    '.bat', '.cmd', '.conf', '.config', '.ini', '.json', '.lua', '.md',
    '.ps1', '.txt', '.xml'
)
foreach ($file in Get-ChildItem -LiteralPath $payloadRoot -Recurse -File) {
    if ($textExtensions -notcontains $file.Extension.ToLowerInvariant()) {
        continue
    }
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $updated = $content
    foreach ($entry in $tokenMap.GetEnumerator()) {
        $updated = $updated.Replace([string] $entry.Key, [string] $entry.Value)
    }
    if ($updated -ne $content) {
        Write-MPVWebLabUtf8Text -Path $file.FullName -Content $updated
    }
}

foreach ($directory in @('scripts', 'docs', 'LICENSES', 'package-root')) {
    $source = Join-Path (Split-Path -Parent $PSScriptRoot) $directory
    if (Test-Path -LiteralPath $source -PathType Container) {
        $destinationName = if ($directory -eq 'scripts') { 'installer' } else { $directory }
        if ($directory -eq 'package-root') {
            Get-ChildItem -LiteralPath $source -File | ForEach-Object {
                Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $packageRoot $_.Name) -Force
            }
        } else {
            Invoke-MPVWebLabRobocopy -Source $source -Destination (Join-Path $packageRoot $destinationName)
        }
    }
}
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'LICENSE') -Destination (Join-Path $packageRoot 'LICENSES\External-Player-MIT-LICENSE.txt') -Force
Write-MPVWebLabUtf8Text -Path (Join-Path $packageRoot 'VERSION') -Content ($Version + [Environment]::NewLine)

$componentFiles = [ordered]@{
    mpvnet = 'payload\mpvnet.exe'
    libmpv = 'payload\libmpv-2.dll'
    ytDlp = 'payload\yt-dlp.exe'
    ffmpeg = 'payload\ffmpeg\ffmpeg.exe'
    userscript = 'payload\external-player-weblab-safe.user.js'
    extension = 'payload\weblab-cookie-extension\manifest.json'
}
$components = [ordered]@{}
foreach ($entry in $componentFiles.GetEnumerator()) {
    $path = Join-Path $packageRoot $entry.Value
    $item = Get-Item -LiteralPath $path
    $components[$entry.Key] = [ordered]@{
        path = $entry.Value.Replace('\', '/')
        fileVersion = [string] $item.VersionInfo.FileVersion
        productVersion = [string] $item.VersionInfo.ProductVersion
        sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}
$components.userscript.declaredVersion = $userscriptVersion
$components.extension.declaredVersion = $extensionVersion

$manifestPath = Join-Path $packageRoot 'release-manifest.json'
$manifestFiles = @(
    Get-ChildItem -LiteralPath $packageRoot -Recurse -File |
        Where-Object { $_.FullName -ne $manifestPath } |
        Sort-Object FullName |
        ForEach-Object {
            [ordered]@{
                path = (Get-MPVWebLabRelativePath -BasePath $packageRoot -TargetPath $_.FullName).Replace('\', '/')
                size = $_.Length
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            }
        }
)
Write-MPVWebLabJson -Path $manifestPath -Value ([ordered]@{
    schemaVersion = 1
    package = 'MPV-WebLab-personal'
    version = $Version
    platform = 'windows-x64'
    createdAt = [DateTimeOffset]::UtcNow.ToString('o')
    sourceRootIncluded = $false
    components = $components
    files = $manifestFiles
}) -Depth 12

& (Join-Path $PSScriptRoot 'Verify-Release.ps1') -PackageRoot $packageRoot -ManifestPath $manifestPath

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
$assetPaths = New-Object System.Collections.Generic.List[string]
$externalManifest = Join-Path $OutputRoot "$packageName.manifest.json"
Copy-Item -LiteralPath $manifestPath -Destination $externalManifest -Force
$assetPaths.Add($externalManifest)

$userscriptAsset = Join-Path $OutputRoot "external-player-weblab-safe-$userscriptVersion.user.js"
Copy-Item -LiteralPath (Join-Path $payloadRoot 'external-player-weblab-safe.user.js') -Destination $userscriptAsset -Force
$assetPaths.Add($userscriptAsset)

if (-not $SkipArchive) {
    $sevenZip = Join-Path $SourceRoot '7z.exe'
    if (-not (Test-Path -LiteralPath $sevenZip -PathType Leaf)) {
        throw "7z.exe is missing from the source deployment: $sevenZip"
    }
    $archivePath = Join-Path $OutputRoot "$packageName.7z"
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    $workingDirectory = Join-Path $OutputRoot '7z-work'
    New-Item -ItemType Directory -Path $workingDirectory -Force | Out-Null
    Push-Location $stagingParent
    try {
        & $sevenZip a -t7z -mx=5 -mmt=on "-w$workingDirectory" $archivePath $packageName
        if ($LASTEXITCODE -ne 0) {
            throw "7-Zip failed with exit code $LASTEXITCODE."
        }
        & $sevenZip t $archivePath
        if ($LASTEXITCODE -ne 0) {
            throw "7-Zip archive test failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
        Remove-MPVWebLabSafeDirectory -Parent $OutputRoot -Child $workingDirectory
    }
    $assetPaths.Add($archivePath)

    $extensionArchive = Join-Path $OutputRoot "weblab-cookie-extension-$extensionVersion.zip"
    if (Test-Path -LiteralPath $extensionArchive) {
        Remove-Item -LiteralPath $extensionArchive -Force
    }
    Push-Location (Join-Path $payloadRoot 'weblab-cookie-extension')
    try {
        & $sevenZip a -tzip -mx=9 $extensionArchive '*'
        if ($LASTEXITCODE -ne 0) {
            throw "Extension ZIP creation failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }
    $assetPaths.Add($extensionArchive)
}

$checksumLines = foreach ($asset in $assetPaths | Sort-Object) {
    $hash = (Get-FileHash -LiteralPath $asset -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $([System.IO.Path]::GetFileName($asset))"
}
$checksumPath = Join-Path $OutputRoot 'SHA256SUMS.txt'
Write-MPVWebLabUtf8Text -Path $checksumPath -Content (($checksumLines -join [Environment]::NewLine) + [Environment]::NewLine)

if (-not $KeepStaging -and -not $SkipArchive) {
    Remove-MPVWebLabSafeDirectory -Parent $stagingParent -Child $packageRoot
}

Write-Host "Release assets are ready in: $OutputRoot" -ForegroundColor Green
$assetPaths | ForEach-Object { Get-Item -LiteralPath $_ } | Select-Object Name, Length, FullName
Get-Item -LiteralPath $checksumPath | Select-Object Name, Length, FullName
