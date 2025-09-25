@echo off
echo 🚀 Démarrage de SoccerBox...
echo 📍 Port: 3000
echo 🌐 URL: http://localhost:3000
echo ⏹️  Ctrl+C pour arrêter
echo.
cd /d "%~dp0"
node server.js
pause
