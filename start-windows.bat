@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Install Node.js 24 or newer from https://nodejs.org before starting this app. & pause & exit /b 1)
node -e "process.exit(Number(process.versions.node.split('.')[0]) < 24 ? 1 : 0)" || (echo Update Node.js to version 24 or newer. & pause & exit /b 1)
echo Website: http://localhost:3000
echo Admin:   http://localhost:3000/admin
call npm.cmd start
pause
