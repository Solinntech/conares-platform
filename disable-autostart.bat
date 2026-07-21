@echo off
setlocal

set "STARTUP_CMD=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ConaresPlatformStart.cmd"

schtasks /Delete /TN "ConaresPlatform" /F >nul 2>&1
if exist "%STARTUP_CMD%" del "%STARTUP_CMD%" >nul 2>&1

echo [Conares] Autoarranque deshabilitado (tarea y Startup).
exit /b 0
