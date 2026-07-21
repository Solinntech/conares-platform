@echo off
setlocal

cd /d "%~dp0"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo [Conares] Deteniendo proceso PID %%a en puerto 3000...
  taskkill /PID %%a /F >nul 2>&1
)

echo [Conares] Proceso de plataforma detenido (si existia).
exit /b 0
