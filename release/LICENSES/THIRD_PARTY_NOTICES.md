# Third-party notices

MPV WebLab bundles third-party software. Each component remains under its own license; the bundle does
not relicense or claim ownership of those projects.

| Component | Upstream | License / notice |
|---|---|---|
| External Player / WebLab userscript | https://github.com/LuckyPuppy514/external-player | MIT; the repository `LICENSE` is copied beside this file. |
| mpv | https://github.com/mpv-player/mpv | GPLv2+ by default; mpv can also be built LGPLv2.1+ when configured accordingly. The bundled build's `COPYING` is included in `payload`. |
| mpv.net | https://github.com/mpvnet-player/mpv.net | Review the exact bundled fork/build and its repository license before public redistribution. |
| yt-dlp | https://github.com/yt-dlp/yt-dlp | Unlicense; see the upstream `LICENSE`. |
| FFmpeg / ffprobe | https://ffmpeg.org/legal.html | LGPLv2.1+ by default, possibly GPL depending on build flags and linked libraries. Verify the exact bundled binary configuration before public redistribution. |
| VapourSynth | https://github.com/vapoursynth/vapoursynth | LGPLv2.1; bundled plugins may use separate licenses. |
| LAV Filters | https://github.com/Nevcairiel/LAVFilters | GPLv2. |
| ReShade | https://github.com/crosire/reshade | BSD-3-Clause; effects and add-ons may use separate licenses. |
| 7-Zip | https://www.7-zip.org/license.txt | LGPL plus unRAR restriction for the unRAR portion. |

This inventory is a release checklist, not a substitute for the license files and corresponding-source
obligations of the exact binaries. Before making a public GitHub Release:

1. Record the source URL, version/commit and SHA-256 for every shipped binary.
2. Add the matching license text for each component and plugin.
3. For GPL components, provide the corresponding source in the manner required by that license.
4. Confirm FFmpeg's actual build configuration and whether GPL/nonfree components are enabled.

Until those checks are complete, use a private GitHub repository for personal cross-device access.

