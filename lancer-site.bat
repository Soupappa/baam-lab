@echo off
setlocal
call "%~dp0..\_tools\portguard.bat" 8089 "BAAM.Lab"
if errorlevel 1 exit /b 1
cd /d "%~dp0"
call npm run build
if errorlevel 1 pause & exit /b 1
start "" http://127.0.0.1:8089
node server.js
endlocal
