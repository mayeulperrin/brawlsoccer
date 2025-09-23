#!/bin/bash

# 🚀 Script de lancement SoccerBox

echo "⚽ ========================================== ⚽"
echo "🎮           SOCCERBOX LAUNCHER            🎮"
echo "⚽ ========================================== ⚽"
echo ""

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé !"
    echo "📥 Téléchargez-le depuis : https://nodejs.org/"
    exit 1
fi

# Vérifier que npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé !"
    exit 1
fi

echo "✅ Node.js $(node --version) détecté"
echo "✅ npm $(npm --version) détecté"
echo ""

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
    echo ""
fi

# Détecter le port disponible
PORT=${PORT:-3000}
echo "🌐 Démarrage du serveur sur le port $PORT..."
echo ""

# Fonction pour ouvrir le navigateur
open_browser() {
    local url="http://localhost:$PORT"
    
    if command -v open &> /dev/null; then
        # macOS
        open "$url"
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open "$url"
    elif command -v start &> /dev/null; then
        # Windows (Git Bash)
        start "$url"
    else
        echo "🌐 Ouvrez votre navigateur à l'adresse : $url"
    fi
}

# Démarrer le serveur
echo "🚀 Lancement de SoccerBox..."
echo "📍 URL du jeu : http://localhost:$PORT"
echo "⚠️  Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""
echo "🎮 Instructions de jeu :"
echo "   • Entrez votre pseudo pour rejoindre"
echo "   • ZQSD ou flèches pour bouger"
echo "   • Espace ou clic pour frapper"
echo "   • Seuls les PIEDS touchent le ballon !"
echo ""

# Attendre un peu puis ouvrir le navigateur
sleep 2 && open_browser &

# Démarrer le serveur Node.js
PORT=$PORT npm start