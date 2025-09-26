#!/bin/bash
echo "🚀 Démarrage de SoccerBox..."
echo "📍 Port: 3000"
echo "🌐 URL: http://localhost:3000"
echo "⏹️  Ctrl+C pour arrêter"
echo ""
cd "$(dirname "$0")"
node server.js
