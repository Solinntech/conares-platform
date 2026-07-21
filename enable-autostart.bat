@echo off
setlocal

cd /d "%~dp0"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_CMD=%STARTUP_DIR%\ConaresPlatformStart.cmd"

schtasks /Create /TN "ConaresPlatform" /TR "\"%~dp0start-platform.bat\"" /SC ONLOGON /F >nul 2>&1
if not errorlevel 1 (
  echo [Conares] Autoarranque habilitado mediante tarea programada.
  echo [Conares] Se ejecutara en el inicio de sesion de Windows.
  exit /b 0
)

echo [Conares] No fue posible crear la tarea programada. Activando metodo Startup...
if not exist "%STARTUP_DIR%" mkdir "%STARTUP_DIR%"
(
  echo @echo off
  echo call "%~dp0start-platform.bat"
) > "%STARTUP_CMD%"

if exist "%STARTUP_CMD%" (
  echo [Conares] Autoarranque habilitado en carpeta Startup del usuario.
  echo [Conares] Archivo: %STARTUP_CMD%
  exit /b 0
)

echo [Conares] No fue posible habilitar el autoarranque.
exit /b 1
