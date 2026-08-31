@echo off
chcp 65001 >nul
set "PACKAGE_ROOT=%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%installer\Install-MPVWebLab.ps1" -PackageRoot "%PACKAGE_ROOT%"
if errorlevel 1 (
  echo.
  echo 安装没有完成，请查看上面的报错或 docs\05-故障排查.md。
) else (
  echo.
  echo 安装与自动检查已完成。
)
pause

