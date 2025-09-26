@echo off
chcp 65001 >nul
title SoccerBox - Script de compilation

echo 🏗️  SoccerBox - Script de compilation
echo =====================================
echo.

:: Vérifier Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé!
    echo 📥 Téléchargez-le depuis: https://nodejs.org/
    pause
    exit /b 1
)

:: Vérifier npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm n'est pas installé!
    pause
    exit /b 1
)

echo ℹ️  Node.js version:
node --version
echo ℹ️  npm version:
npm --version
echo.

:: Installer les dépendances si nécessaire
if not exist "node_modules" (
    echo ℹ️  Installation des dépendances...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erreur lors de l'installation des dépendances
        pause
        exit /b 1
    )
    echo ✅ Dépendances installées
    echo.
)

:: Lancer la compilation
echo ℹ️  Lancement de la compilation...
node build.js

if %errorlevel% equ 0 (
    echo.
    echo ✅ Compilation réussie!
    echo.
    echo 📦 L'application compilée se trouve dans le dossier 'dist\'
    echo 🚀 Pour la démarrer :
    echo    cd dist
    echo    npm install
    echo    npm start
    echo.
    echo 🌐 Puis ouvrez: http://localhost:3000
) else (
    echo ❌ Erreur lors de la compilation
    pause
    exit /b 1
)

echo.
echo 🎯 Appuyez sur une touche pour continuer...
pause >nul