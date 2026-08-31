# MPV WebLab Personal

面向个人使用的 Windows x64 MPV.NET 网页播放懒人包。包含当前配置好的播放器运行时、
ModernZ/WebLab 界面脚本、FFmpeg、yt-dlp、Chrome/Edge Cookie Sync 扩展和油猴脚本。

## 下载

[前往 Releases 下载最新版](https://github.com/OmoriRay/MPV-WebLab-Personal/releases/latest)

首次使用下载：

```text
MPV-WebLab-personal-1.0.0-win-x64.7z
SHA256SUMS.txt
```

完整解压后双击 `开始安装.cmd`。默认安装到 `D:\Apps\MPV-WebLab`；没有 D 盘时自动
使用 `%LOCALAPPDATA%\MPV-WebLab`。详细步骤见
[首次安装教程](release/docs/01-首次安装.md)。

## 浏览器

- Chrome、Edge：支持 Cookie Sync 扩展，见
  [Chrome/Edge 教程](release/docs/02-Chrome与Edge.md)。
- Tampermonkey：安装 Release 中的 `external-player-weblab-safe-1.5.1.user.js`，见
  [油猴脚本教程](release/docs/03-油猴脚本.md)。
- Firefox：当前不支持。

## 隐私

Release 构建不会包含 Cookie、缓存、观看历史、日志、PDB 或 MPV.NET 最近播放记录。
Cookie 只会由新设备上的本地扩展生成到安装目录的 `credentials` 文件夹。不要上传、分享
或截图展示该文件夹内容。

## 更新与校验

更新、卸载和数据保留规则见[更新与卸载](release/docs/04-更新与卸载.md)。下载后可运行：

```powershell
Get-FileHash ".\MPV-WebLab-personal-1.0.0-win-x64.7z" -Algorithm SHA256
```

结果应与 Release 附带的 `SHA256SUMS.txt` 一致。

## 源码与构建

仓库只保存安装器、教程、浏览器扩展、油猴脚本及可重复构建脚本。约 290 MB 的完整播放器
只作为 GitHub Release 资产发布，不进入 Git 历史。

```powershell
powershell -ExecutionPolicy Bypass -File ".\release\scripts\Build-Release.ps1" `
  -Version "1.0.0" `
  -SourceRoot "D:\Apps\MPV-WebLab"
```

第三方组件继续使用各自许可证。公开再分发注意事项见
[第三方许可清单](release/LICENSES/THIRD_PARTY_NOTICES.md)。

