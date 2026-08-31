# MPV WebLab 个人懒人包

这是按当前个人配置制作的 Windows x64 懒人包，包含 MPV.NET、libmpv、FFmpeg、
yt-dlp、ModernZ/WebLab 脚本、Chrome/Edge Cookie Sync 扩展和油猴脚本。

## 最快安装

1. 把压缩包完整解压到一个临时目录，不能在 7-Zip 窗口里直接运行。
2. 双击 `开始安装.cmd`。
3. 默认安装到 `D:\Apps\MPV-WebLab`；没有 D 盘时自动使用
   `%LOCALAPPDATA%\MPV-WebLab`。
4. 按 `docs` 目录中的 Chrome/Edge 教程加载浏览器扩展。
5. 按 `docs` 目录中的油猴脚本教程安装脚本。
6. 在 Bilibili、YouTube 或 Twitch 视频页按 `W` 测试。

安装器使用当前用户的注册表区域，不要求管理员权限。Cookie、缓存和观看历史不会包含在
压缩包里；它们只会在这台设备本地生成。

需要自定义安装位置时，在 PowerShell 中运行：

```powershell
powershell -ExecutionPolicy Bypass -File ".\installer\Install-MPVWebLab.ps1" -InstallRoot "F:\Apps\MPV-WebLab"
```

