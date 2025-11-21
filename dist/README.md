# SoccerBox - Version Compilée

## 🚀 Démarrage rapide

### Prérequis
- Node.js (version 14 ou supérieure)

### Installation
1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Démarrer le serveur :
   
   **Linux/Mac :**
   ```bash
   ./start.sh
   ```
   
   **Windows :**
   ```batch
   start.bat
   ```
   
   **Ou manuellement :**
   ```bash
   npm start
   ```

3. Ouvrir dans le navigateur : http://localhost:3000

## 🎮 Fonctionnalités

- ⚽ Football-boxe multijoueur en temps réel
- 🥊 Système de combat avec barres de vie
- 🎵 Sons personnalisés (dossiers kick/, goal/, ko/)
- 🏟️ Terrain 3D optimisé avec physics réalistes
- 👥 Support jusqu'à 8 joueurs simultanés
- 🎯 Interface utilisateur complète

## 📁 Structure

- `server.js` - Serveur Node.js principal
- `public/` - Fichiers web statiques (minifiés)
- `public/medias/` - Sons et ressources média

## 🔧 Configuration

Le serveur démarre sur le port 3000 par défaut.
Pour changer le port, modifier la variable dans server.js.

---
Généré le 20/11/2025
