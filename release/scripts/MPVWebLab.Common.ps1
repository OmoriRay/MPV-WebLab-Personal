Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:NativeHostName = 'mpv_weblab_youtube_cookie_sync'
$script:VideoProgId = 'MPVWebLab.Video'
$script:SupportedVideoExtensions = @(
    '.3g2', '.3gp', '.asf', '.avi', '.flv', '.m2ts', '.m4v', '.mkv',
    '.mov', '.mp4', '.mpeg', '.mpg', '.mts', '.ogm', '.ogv', '.rm',
    '.rmvb', '.ts', '.vob', '.webm', '.wmv'
)

function Resolve-MPVWebLabPath {
    param(
        [Parameter(Mandatory)]
        [string] $Path,
        [string] $BasePath = (Get-Location).Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $BasePath $Path))
}

function Get-MPVWebLabRelativePath {
    param(
        [Parameter(Mandatory)]
        [string] $BasePath,
        [Parameter(Mandatory)]
        [string] $TargetPath
    )

    $baseFull = (Resolve-MPVWebLabPath -Path $BasePath).TrimEnd('\') + '\'
    $targetFull = Resolve-MPVWebLabPath -Path $TargetPath
    $baseUri = New-Object System.Uri($baseFull)
    $targetUri = New-Object System.Uri($targetFull)
    $relativeUri = $baseUri.MakeRelativeUri($targetUri)
    return [System.Uri]::UnescapeDataString($relativeUri.ToString()).Replace('/', '\')
}

function Assert-MPVWebLabSafeChildPath {
    param(
        [Parameter(Mandatory)]
        [string] $Parent,
        [Parameter(Mandatory)]
        [string] $Child
    )

    $parentFull = (Resolve-MPVWebLabPath -Path $Parent).TrimEnd('\') + '\'
    $childFull = Resolve-MPVWebLabPath -Path $Child
    if (-not $childFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to operate outside the expected directory: $childFull"
    }
    return $childFull
}

function Remove-MPVWebLabSafeDirectory {
    param(
        [Parameter(Mandatory)]
        [string] $Parent,
        [Parameter(Mandatory)]
        [string] $Child
    )

    $childFull = Assert-MPVWebLabSafeChildPath -Parent $Parent -Child $Child
    if (Test-Path -LiteralPath $childFull) {
        Remove-Item -LiteralPath $childFull -Recurse -Force
    }
}

function Invoke-MPVWebLabRobocopy {
    param(
        [Parameter(Mandatory)]
        [string] $Source,
        [Parameter(Mandatory)]
        [string] $Destination,
        [switch] $Mirror,
        [string[]] $ExcludeDirectories = @(),
        [string[]] $ExcludeFiles = @()
    )

    if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
        throw "Source directory is missing: $Source"
    }
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null

    $arguments = @(
        $Source,
        $Destination,
        $(if ($Mirror) { '/MIR' } else { '/E' }),
        '/COPY:DAT',
        '/DCOPY:DAT',
        '/R:2',
        '/W:1',
        '/XJ',
        '/NP',
        '/NFL',
        '/NDL'
    )
    if ($ExcludeDirectories.Count -gt 0) {
        $arguments += '/XD'
        $arguments += $ExcludeDirectories
    }
    if ($ExcludeFiles.Count -gt 0) {
        $arguments += '/XF'
        $arguments += $ExcludeFiles
    }

    & robocopy.exe @arguments | Out-Host
    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed with exit code $LASTEXITCODE."
    }
}

function Write-MPVWebLabUtf8Text {
    param(
        [Parameter(Mandatory)]
        [string] $Path,
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string] $Content
    )

    $parent = Split-Path -Parent $Path
    if ($parent) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Write-MPVWebLabJson {
    param(
        [Parameter(Mandatory)]
        [string] $Path,
        [Parameter(Mandatory)]
        [object] $Value,
        [int] $Depth = 10
    )

    $json = $Value | ConvertTo-Json -Depth $Depth
    Write-MPVWebLabUtf8Text -Path $Path -Content ($json + [Environment]::NewLine)
}

function Get-MPVWebLabDefaultInstallRoot {
    if (Test-Path -LiteralPath 'D:\' -PathType Container) {
        return 'D:\Apps\MPV-WebLab'
    }
    return Join-Path $env:LOCALAPPDATA 'MPV-WebLab'
}

function Get-MPVWebLabDesktopPath {
    $desktop = [Environment]::GetFolderPath('DesktopDirectory')
    if ([string]::IsNullOrWhiteSpace($desktop)) {
        $desktop = Join-Path $env:USERPROFILE 'Desktop'
    }
    return $desktop
}

function Get-MPVWebLabNodeRuntime {
    $node = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($node -and (Test-Path -LiteralPath $node.Source -PathType Leaf)) {
        return "node:$($node.Source)"
    }
    $defaultNode = 'C:\Program Files\nodejs\node.exe'
    if (Test-Path -LiteralPath $defaultNode -PathType Leaf) {
        return "node:$defaultNode"
    }
    return 'node'
}

function Get-MPVWebLabExtensionId {
    param(
        [Parameter(Mandatory)]
        [string] $ManifestPath
    )

    $manifest = [System.IO.File]::ReadAllText($ManifestPath) | ConvertFrom-Json
    if (-not $manifest.key) {
        throw "Browser extension manifest is missing its stable key: $ManifestPath"
    }
    $publicKey = [Convert]::FromBase64String([string] $manifest.key)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = $sha.ComputeHash($publicKey)
    } finally {
        $sha.Dispose()
    }
    $alphabet = 'abcdefghijklmnop'
    $builder = New-Object System.Text.StringBuilder
    foreach ($value in $hash[0..15]) {
        [void] $builder.Append($alphabet[($value -shr 4) -band 0x0f])
        [void] $builder.Append($alphabet[$value -band 0x0f])
    }
    return $builder.ToString()
}

function Expand-MPVWebLabRuntimeMarkers {
    param(
        [Parameter(Mandatory)]
        [string] $InstallRoot,
        [Parameter(Mandatory)]
        [string] $TimeshiftCacheRoot
    )

    $desktop = Get-MPVWebLabDesktopPath
    $userProfile = [Environment]::GetFolderPath('UserProfile')
    $replacementMap = [ordered]@{
        '__MPV_WEBLAB_ROOT_ESCAPED__' = $InstallRoot.Replace('\', '\\')
        '__MPV_WEBLAB_ROOT_FORWARD__' = $InstallRoot.Replace('\', '/')
        '__MPV_WEBLAB_ROOT__' = $InstallRoot
        '__MPV_WEBLAB_DESKTOP_ESCAPED__' = $desktop.Replace('\', '\\')
        '__MPV_WEBLAB_DESKTOP_FORWARD__' = $desktop.Replace('\', '/')
        '__MPV_WEBLAB_DESKTOP__' = $desktop
        '__MPV_WEBLAB_USERPROFILE_ESCAPED__' = $userProfile.Replace('\', '\\')
        '__MPV_WEBLAB_USERPROFILE_FORWARD__' = $userProfile.Replace('\', '/')
        '__MPV_WEBLAB_USERPROFILE__' = $userProfile
        '__MPV_WEBLAB_TIMESHIFT_ESCAPED__' = $TimeshiftCacheRoot.Replace('\', '\\')
        '__MPV_WEBLAB_TIMESHIFT_FORWARD__' = $TimeshiftCacheRoot.Replace('\', '/')
        '__MPV_WEBLAB_TIMESHIFT__' = $TimeshiftCacheRoot
    }
    $textExtensions = @(
        '.bat', '.cmd', '.conf', '.config', '.ini', '.json', '.lua', '.md',
        '.ps1', '.txt', '.xml'
    )
    foreach ($file in Get-ChildItem -LiteralPath $InstallRoot -Recurse -File) {
        if ($textExtensions -notcontains $file.Extension.ToLowerInvariant()) {
            continue
        }
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $updated = $content
        foreach ($entry in $replacementMap.GetEnumerator()) {
            $updated = $updated.Replace([string] $entry.Key, [string] $entry.Value)
        }
        if ($updated -ne $content) {
            Write-MPVWebLabUtf8Text -Path $file.FullName -Content $updated
        }
    }
}

function Set-MPVWebLabRuntimeConfiguration {
    param(
        [Parameter(Mandatory)]
        [string] $InstallRoot,
        [Parameter(Mandatory)]
        [string] $Version,
        [AllowEmptyString()]
        [string] $ProxyUrl = '__PRESERVE__',
        [string] $TimeshiftCacheRoot = ''
    )

    $InstallRoot = Resolve-MPVWebLabPath -Path $InstallRoot
    if ([string]::IsNullOrWhiteSpace($TimeshiftCacheRoot)) {
        $TimeshiftCacheRoot = if (Test-Path -LiteralPath 'E:\' -PathType Container) {
            'E:\.mpv-bilibili-timeshift'
        } else {
            Join-Path $InstallRoot 'cache\bilibili-timeshift'
        }
    } else {
        $TimeshiftCacheRoot = Resolve-MPVWebLabPath -Path $TimeshiftCacheRoot
    }

    @(
        'credentials',
        'cache\yt-dlp',
        'cache\reshade',
        'temp',
        'portable_config\cache\icc',
        'portable_config\cache\shader',
        'portable_config\watch_later',
        $TimeshiftCacheRoot
    ) | ForEach-Object {
        $directory = if ([System.IO.Path]::IsPathRooted($_)) { $_ } else { Join-Path $InstallRoot $_ }
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    Expand-MPVWebLabRuntimeMarkers -InstallRoot $InstallRoot -TimeshiftCacheRoot $TimeshiftCacheRoot

    $handlerPath = Join-Path $InstallRoot 'url-scheme-handler-lab\config.json'
    $existingHandler = $null
    if (Test-Path -LiteralPath $handlerPath -PathType Leaf) {
        $existingHandler = [System.IO.File]::ReadAllText($handlerPath) | ConvertFrom-Json
    }
    $youtubeProxy = if ($existingHandler -and $null -ne $existingHandler.youtubeProxy) {
        [string] $existingHandler.youtubeProxy
    } else { '' }
    $generalProxy = if ($existingHandler -and $null -ne $existingHandler.proxy) {
        [string] $existingHandler.proxy
    } else { '' }
    if ($ProxyUrl -ne '__PRESERVE__') {
        $youtubeProxy = $ProxyUrl
        $generalProxy = $ProxyUrl
    }
    Write-MPVWebLabJson -Path $handlerPath -Value ([ordered]@{
        is_registry_added = $true
        apps = @([ordered]@{
            name = 'MPVNET'
            path = Join-Path $InstallRoot 'mpvnet.exe'
        })
        youtubeProxy = $youtubeProxy
        proxy = $generalProxy
    })

    $nativeHostDirectory = Join-Path $InstallRoot 'youtube-cookie-native-host'
    $extensionManifest = Join-Path $InstallRoot 'weblab-cookie-extension\manifest.json'
    $extensionId = Get-MPVWebLabExtensionId -ManifestPath $extensionManifest
    Write-MPVWebLabJson -Path (Join-Path $nativeHostDirectory 'config.json') -Value ([ordered]@{
        outputPath = Join-Path $InstallRoot 'credentials\youtube-cookies.txt'
        bilibiliOutputPath = Join-Path $InstallRoot 'credentials\bilibili-cookies.txt'
    })
    Write-MPVWebLabJson -Path (Join-Path $nativeHostDirectory 'native-host-manifest.json') -Value ([ordered]@{
        name = $script:NativeHostName
        description = 'Writes isolated YouTube and Bilibili cookie files for MPV WebLab.'
        path = Join-Path $nativeHostDirectory 'mpv-weblab-youtube-cookie-host.exe'
        type = 'stdio'
        allowed_origins = @("chrome-extension://$extensionId/")
    })

    Write-MPVWebLabJson -Path (Join-Path $InstallRoot 'yt-dlp-weblab-wrapper\config.json') -Value ([ordered]@{
        ytDlpPath = Join-Path $InstallRoot 'yt-dlp.exe'
        youtubeCookiePath = Join-Path $InstallRoot 'credentials\youtube-cookies.txt'
        bilibiliCookiePath = Join-Path $InstallRoot 'credentials\bilibili-cookies.txt'
        cacheDirectory = Join-Path $InstallRoot 'cache\yt-dlp'
        javaScriptRuntime = Get-MPVWebLabNodeRuntime
    })

    $downloadConfig = Join-Path $InstallRoot 'portable_config\script-opts\weblab-download-folder.conf'
    if (-not (Test-Path -LiteralPath $downloadConfig -PathType Leaf)) {
        Write-MPVWebLabUtf8Text -Path $downloadConfig -Content (
            "# Right-click the download button to replace this path with a selected folder.`r`n" +
            "path=$(Get-MPVWebLabDesktopPath)`r`n"
        )
    }

    Write-MPVWebLabJson -Path (Join-Path $InstallRoot 'install-state.json') -Value ([ordered]@{
        version = $Version
        installRoot = $InstallRoot
        installedAt = [DateTimeOffset]::Now.ToString('o')
        extensionId = $extensionId
        timeshiftCacheRoot = $TimeshiftCacheRoot
        proxy = $generalProxy
    })
}

function Register-MPVWebLab {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [string] $InstallRoot
    )

    $InstallRoot = Resolve-MPVWebLabPath -Path $InstallRoot
    $handler = Join-Path $InstallRoot 'url-scheme-handler-lab\url-scheme-handler-lab.exe'
    $mpvnet = Join-Path $InstallRoot 'mpvnet.exe'
    $nativeManifest = Join-Path $InstallRoot 'youtube-cookie-native-host\native-host-manifest.json'
    foreach ($required in @($handler, $mpvnet, $nativeManifest)) {
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
            throw "Cannot register a missing file: $required"
        }
    }

    foreach ($scheme in @('ush-weblab', 'ush')) {
        $schemeRoot = "Registry::HKEY_CURRENT_USER\Software\Classes\$scheme"
        if ($PSCmdlet.ShouldProcess($schemeRoot, 'register URL protocol')) {
            New-Item -Path $schemeRoot -Force | Out-Null
            Set-Item -Path $schemeRoot -Value "URL:MPV WebLab $scheme Protocol"
            New-ItemProperty -Path $schemeRoot -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
            $commandKey = Join-Path $schemeRoot 'shell\open\command'
            New-Item -Path $commandKey -Force | Out-Null
            Set-Item -Path $commandKey -Value ('"{0}" run "%1"' -f $handler)
        }
    }

    $nativeRegistryRoots = @(
        'Registry::HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts',
        'Registry::HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts'
    )
    foreach ($root in $nativeRegistryRoots) {
        $key = Join-Path $root $script:NativeHostName
        if ($PSCmdlet.ShouldProcess($key, 'register native messaging host')) {
            New-Item -Path $key -Force | Out-Null
            Set-Item -Path $key -Value $nativeManifest
        }
    }

    $applicationKey = 'Registry::HKEY_CURRENT_USER\Software\Classes\Applications\mpvnet.exe'
    $progIdKey = "Registry::HKEY_CURRENT_USER\Software\Classes\$($script:VideoProgId)"
    if ($PSCmdlet.ShouldProcess($applicationKey, 'register MPV.NET in Open with')) {
        New-Item -Path "$applicationKey\shell\open\command" -Force | Out-Null
        Set-Item -Path "$applicationKey\shell\open\command" -Value ('"{0}" "%1"' -f $mpvnet)
        New-Item -Path "$applicationKey\SupportedTypes" -Force | Out-Null
        foreach ($extension in $script:SupportedVideoExtensions) {
            New-ItemProperty -Path "$applicationKey\SupportedTypes" -Name $extension -Value '' -PropertyType String -Force | Out-Null
        }

        New-Item -Path "$progIdKey\DefaultIcon" -Force | Out-Null
        Set-Item -Path "$progIdKey\DefaultIcon" -Value "$mpvnet,0"
        New-Item -Path "$progIdKey\shell\open\command" -Force | Out-Null
        Set-Item -Path "$progIdKey\shell\open\command" -Value ('"{0}" "%1"' -f $mpvnet)
        Set-Item -Path $progIdKey -Value 'MPV WebLab Video'
        foreach ($extension in $script:SupportedVideoExtensions) {
            $openWithKey = "Registry::HKEY_CURRENT_USER\Software\Classes\$extension\OpenWithProgids"
            New-Item -Path $openWithKey -Force | Out-Null
            New-ItemProperty -Path $openWithKey -Name $script:VideoProgId -Value '' -PropertyType String -Force | Out-Null
        }
    }
}

function Unregister-MPVWebLab {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [string] $InstallRoot
    )

    $InstallRoot = Resolve-MPVWebLabPath -Path $InstallRoot
    foreach ($scheme in @('ush-weblab', 'ush')) {
        $schemeRoot = "Registry::HKEY_CURRENT_USER\Software\Classes\$scheme"
        if (Test-Path -LiteralPath $schemeRoot) {
            $commandKey = Join-Path $schemeRoot 'shell\open\command'
            $current = if (Test-Path -LiteralPath $commandKey) { (Get-Item -LiteralPath $commandKey).GetValue('') } else { '' }
            if ([string] $current -like "*$InstallRoot*") {
                if ($PSCmdlet.ShouldProcess($schemeRoot, 'unregister URL protocol')) {
                    Remove-Item -LiteralPath $schemeRoot -Recurse -Force
                }
            }
        }
    }

    foreach ($root in @(
        'Registry::HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts',
        'Registry::HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts'
    )) {
        $key = Join-Path $root $script:NativeHostName
        if (Test-Path -LiteralPath $key) {
            $current = (Get-Item -LiteralPath $key).GetValue('')
            if ([string] $current -like "*$InstallRoot*") {
                if ($PSCmdlet.ShouldProcess($key, 'unregister native messaging host')) {
                    Remove-Item -LiteralPath $key -Recurse -Force
                }
            }
        }
    }

    $applicationKey = 'Registry::HKEY_CURRENT_USER\Software\Classes\Applications\mpvnet.exe'
    $applicationCommand = "$applicationKey\shell\open\command"
    if (Test-Path -LiteralPath $applicationCommand) {
        $current = (Get-Item -LiteralPath $applicationCommand).GetValue('')
        if ([string] $current -like "*$InstallRoot*") {
            if ($PSCmdlet.ShouldProcess($applicationKey, 'remove MPV.NET Open with registration')) {
                Remove-Item -LiteralPath $applicationKey -Recurse -Force
            }
        }
    }

    $progIdKey = "Registry::HKEY_CURRENT_USER\Software\Classes\$($script:VideoProgId)"
    if (Test-Path -LiteralPath $progIdKey) {
        $commandKey = Join-Path $progIdKey 'shell\open\command'
        $current = if (Test-Path -LiteralPath $commandKey) { (Get-Item -LiteralPath $commandKey).GetValue('') } else { '' }
        if ([string] $current -like "*$InstallRoot*") {
            if ($PSCmdlet.ShouldProcess($progIdKey, 'remove MPV WebLab file type')) {
                Remove-Item -LiteralPath $progIdKey -Recurse -Force
                foreach ($extension in $script:SupportedVideoExtensions) {
                    $openWithKey = "Registry::HKEY_CURRENT_USER\Software\Classes\$extension\OpenWithProgids"
                    if (Test-Path -LiteralPath $openWithKey) {
                        Remove-ItemProperty -LiteralPath $openWithKey -Name $script:VideoProgId -ErrorAction SilentlyContinue
                    }
                }
            }
        }
    }
}

function Test-MPVWebLabInstall {
    param(
        [Parameter(Mandatory)]
        [string] $InstallRoot,
        [switch] $SkipRegistry
    )

    $InstallRoot = Resolve-MPVWebLabPath -Path $InstallRoot
    $results = New-Object System.Collections.Generic.List[object]
    function Add-Result([string] $Name, [bool] $Passed, [string] $Detail, [bool] $Required = $true) {
        $results.Add([pscustomobject]@{
            Check = $Name
            Passed = $Passed
            Required = $Required
            Detail = $Detail
        })
    }

    foreach ($relative in @(
        'mpvnet.exe',
        'yt-dlp.exe',
        'ffmpeg\ffmpeg.exe',
        'portable_config\mpv.conf',
        'url-scheme-handler-lab\url-scheme-handler-lab.exe',
        'youtube-cookie-native-host\mpv-weblab-youtube-cookie-host.exe',
        'yt-dlp-weblab-wrapper\yt-dlp-weblab-wrapper.exe',
        'weblab-cookie-extension\manifest.json',
        'external-player-weblab-safe.user.js',
        'install-state.json'
    )) {
        $path = Join-Path $InstallRoot $relative
        Add-Result "file:$relative" (Test-Path -LiteralPath $path -PathType Leaf) $path
    }

    $markerFiles = @()
    $runtimeMarkers = @(
        '__MPV_WEBLAB_ROOT_ESCAPED__', '__MPV_WEBLAB_ROOT_FORWARD__', '__MPV_WEBLAB_ROOT__',
        '__MPV_WEBLAB_DESKTOP_ESCAPED__', '__MPV_WEBLAB_DESKTOP_FORWARD__', '__MPV_WEBLAB_DESKTOP__',
        '__MPV_WEBLAB_USERPROFILE_ESCAPED__', '__MPV_WEBLAB_USERPROFILE_FORWARD__', '__MPV_WEBLAB_USERPROFILE__',
        '__MPV_WEBLAB_TIMESHIFT_ESCAPED__', '__MPV_WEBLAB_TIMESHIFT_FORWARD__', '__MPV_WEBLAB_TIMESHIFT__'
    )
    $textExtensions = @('.bat', '.cmd', '.conf', '.config', '.ini', '.json', '.lua', '.ps1', '.txt', '.xml')
    foreach ($file in Get-ChildItem -LiteralPath $InstallRoot -Recurse -File -ErrorAction SilentlyContinue) {
        $maintenancePrefix = (Join-Path $InstallRoot 'maintenance').TrimEnd('\') + '\'
        if ($file.FullName.StartsWith($maintenancePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            continue
        }
        if ($textExtensions -contains $file.Extension.ToLowerInvariant()) {
            $text = [System.IO.File]::ReadAllText($file.FullName)
            if (@($runtimeMarkers | Where-Object { $text.Contains($_) }).Count -gt 0) {
                $markerFiles += $file.FullName
            }
        }
    }
    Add-Result 'runtime-markers-expanded' ($markerFiles.Count -eq 0) ($markerFiles -join '; ')

    $extensionManifestPath = Join-Path $InstallRoot 'weblab-cookie-extension\manifest.json'
    $nativeManifestPath = Join-Path $InstallRoot 'youtube-cookie-native-host\native-host-manifest.json'
    if ((Test-Path -LiteralPath $extensionManifestPath) -and (Test-Path -LiteralPath $nativeManifestPath)) {
        $extensionId = Get-MPVWebLabExtensionId -ManifestPath $extensionManifestPath
        $nativeManifest = [System.IO.File]::ReadAllText($nativeManifestPath) | ConvertFrom-Json
        $expectedOrigin = "chrome-extension://$extensionId/"
        Add-Result 'extension-native-host-id' ($nativeManifest.allowed_origins -contains $expectedOrigin) $expectedOrigin
        Add-Result 'native-host-executable-path' ([string] $nativeManifest.path -eq (Join-Path $InstallRoot 'youtube-cookie-native-host\mpv-weblab-youtube-cookie-host.exe')) ([string] $nativeManifest.path)
    }

    $nodeAvailable = [bool] (Get-Command node.exe -ErrorAction SilentlyContinue)
    Add-Result 'node-runtime' $nodeAvailable $(if ($nodeAvailable) { (Get-Command node.exe).Source } else { 'Node.js is not on PATH; YouTube extraction may be limited.' }) $false

    if (-not $SkipRegistry) {
        $handler = Join-Path $InstallRoot 'url-scheme-handler-lab\url-scheme-handler-lab.exe'
        foreach ($scheme in @('ush-weblab', 'ush')) {
            $key = "Registry::HKEY_CURRENT_USER\Software\Classes\$scheme\shell\open\command"
            $value = if (Test-Path -LiteralPath $key) { [string] (Get-Item -LiteralPath $key).GetValue('') } else { '' }
            Add-Result "registry:$scheme" ($value -like "*$handler*") $value
        }
        foreach ($browser in @(
            @{ Name = 'Chrome'; Root = 'Registry::HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts' },
            @{ Name = 'Edge'; Root = 'Registry::HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts' }
        )) {
            $key = Join-Path $browser.Root $script:NativeHostName
            $value = if (Test-Path -LiteralPath $key) { [string] (Get-Item -LiteralPath $key).GetValue('') } else { '' }
            $expected = Join-Path $InstallRoot 'youtube-cookie-native-host\native-host-manifest.json'
            Add-Result "registry:native-host:$($browser.Name)" ($value -eq $expected) $value
        }
    }

    $results | Format-Table -AutoSize | Out-Host
    $failed = @($results | Where-Object { $_.Required -and -not $_.Passed })
    if ($failed.Count -gt 0) {
        throw "MPV WebLab verification failed: $($failed.Count) required check(s) failed."
    }
    return $results
}
