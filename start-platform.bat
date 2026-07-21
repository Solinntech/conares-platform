@echo off
setlocal

cd /d "%~dp0"
set "ROOT=%~dp0"

echo [Conares] Validando dependencias...
if not exist "frontend\node_modules" (
  echo [Conares] Instalando dependencias frontend...
  call npm.cmd install --prefix frontend
  if errorlevel 1 goto :error
)

if not exist "backend\node_modules" (
  echo [Conares] Instalando dependencias backend...
  call npm.cmd install --prefix backend
  if errorlevel 1 goto :error
)

echo [Conares] Construyendo frontend...
call npm.cmd run build --prefix frontend
if errorlevel 1 goto :error

echo [Conares] Construyendo backend...
call npm.cmd run build --prefix backend
if errorlevel 1 goto :error

echo [Conares] Iniciando plataforma en segundo plano...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','start:prod' -WorkingDirectory '%ROOT%backend' -WindowStyle Hidden"
if errorlevel 1 goto :error

timeout /t 2 /nobreak >nul
for /f %%s in ('powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing http://localhost:3000).StatusCode } catch { 0 }"') do set "STATUS=%%s"
if not "%STATUS%"=="200" (
  echo [Conares] Advertencia: el servicio no respondio con codigo 200 aun.
)

echo [Conares] Plataforma iniciada. URL: http://localhost:3000
echo [Conares] Puedes cerrar VS Code sin detener la plataforma.
exit /b 0

:error
echo [Conares] Error durante la preparacion o el arranque.
exit /b 1
