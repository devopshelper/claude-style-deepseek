@echo off
rem Claude Style for DeepSeek Harness - double-clickable installer.
rem Downloads install.ps1 next to this file when it is missing, then runs it.
rem Any arguments are passed through, e.g. install.bat -Profile web
setlocal EnableExtensions

set "REPO=https://raw.githubusercontent.com/devopshelper/claude-style-deepseek/main"
set "HERE=%~dp0"
set "PS1=%HERE%install.ps1"

if not exist "%PS1%" (
    echo Downloading install.ps1 ...
    if exist "%SystemRoot%\System32\curl.exe" (
        "%SystemRoot%\System32\curl.exe" -fsSL -o "%PS1%" "%REPO%/install.ps1"
    ) else (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri '%REPO%/install.ps1' -OutFile '%PS1%'"
    )
)

if not exist "%PS1%" (
    echo.
    echo Could not download install.ps1.
    echo Download it manually from %REPO%/install.ps1 and run it with:
    echo     powershell -ExecutionPolicy Bypass -File install.ps1
    echo.
    if not defined CC_NO_PAUSE pause
    exit /b 1
)

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" set "PS=powershell.exe"

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*
set "CODE=%ERRORLEVEL%"

echo.
echo %cmdcmdline% | find /i "%~nx0" >nul && if not defined CC_NO_PAUSE pause
exit /b %CODE%
