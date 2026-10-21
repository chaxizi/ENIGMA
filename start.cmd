@echo off
setlocal
cd /d "%~dp0"

set "ENIGMA_NODE="
for /f "delims=" %%N in ('where.exe node.exe 2^>nul') do call :check_node "%%N"
if defined ENIGMA_NODE goto runtime_ready
call :check_node "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if defined ENIGMA_NODE goto runtime_ready

echo A compatible Node.js runtime was not found.
echo Install Node.js 24 LTS, then reopen this launcher.
echo https://nodejs.org/
pause
exit /b 1

:runtime_ready
if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies are missing. Install Node.js 24 LTS, then run npm ci in this folder.
  pause
  exit /b 1
)

echo Starting Enigma. Keep this window open while using the website.
echo The local address will appear below. Closing this window stops the server.
set "ENIGMA_OPEN=--open"
if /i "%~1"=="--no-open" set "ENIGMA_OPEN="
"%ENIGMA_NODE%" "node_modules\vite\bin\vite.js" --host 127.0.0.1 %ENIGMA_OPEN%
set "ENIGMA_EXIT_CODE=%ERRORLEVEL%"
if not "%ENIGMA_EXIT_CODE%"=="0" (
  echo.
  echo Startup failed. Please keep the error message above for troubleshooting.
  pause
)
exit /b %ENIGMA_EXIT_CODE%

:check_node
if defined ENIGMA_NODE exit /b 0
if not exist "%~1" exit /b 0
"%~1" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)" >nul 2>&1
if errorlevel 1 exit /b 0
set "ENIGMA_NODE=%~1"
exit /b 0
