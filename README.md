# ⚽ SoccerBox - Jeu de Football-Boxe Multijoueur 3D

![SoccerBox Logo](https://img.shields.io/badge/SoccerBox-Football%20%2B%20Boxe-success?style=for-the-badge&logo=sports)

Un jeu multijoueur innovant qui combine le football et la boxe dans un environnement 3D immersif. Les joueurs peuvent marquer des buts avec leurs pieds tout en se défendant avec leurs poings !

## 🎮 Concept du Jeu

- **Terrain** : Terrain de football 3D avec pelouse, buts et lignes réglementaires
- **Joueurs** : Personnages 3D avec gants de boxe rouges
- **Objectif** : Marquer des buts en poussant le ballon avec les pieds uniquement
- **Combat** : Se défendre et attaquer avec les poings pour récupérer le ballon
- **Multijoueur** : Jusqu'à 8 joueurs répartis en 2 équipes (Bleue vs Rouge)

## 🚀 Fonctionnalités

### ✨ Gameplay
- ⚽ Physique réaliste du ballon avec Cannon.js
- 👊 Système de combat avec coups de poing et K.O.
- 🏃 Déplacements fluides avec ZQSD ou les flèches
- 🥅 Détection automatique des buts
- ❤️ Système de vie et récupération automatique
- 🏆 Score en temps réel et fin de partie

### 🌐 Multijoueur
- 🔄 Synchronisation temps réel via WebSockets
- 👥 Jusqu'à 8 joueurs simultanés
- 🔵🔴 Attribution automatique des équipes
- 📡 Gestion des connexions/déconnexions
- 🎯 Latence optimisée avec buffers de mouvement

### 🎨 Graphismes 3D
- 🏟️ Terrain de football détaillé avec éclairage dynamique
- 💡 Éclairage de stade avec pylônes
- ⚽ Ballon avec texture réaliste
- 👤 Personnages avec gants de boxe distinctifs
- 🎭 Effets visuels : particules, animations, secousses

### 🎛️ Interface
- 📱 Interface responsive (desktop/mobile)
- 🏷️ Connexion avec pseudo personnalisé
- 📊 Tableau de score en temps réel
- 👥 Liste des joueurs avec statuts
- 🎮 Guide des contrôles intégré
- 🏆 Messages de victoire/défaite

## 📋 Prérequis

### Système
- **Node.js** 14+ 
- **npm** ou **yarn**
- **Navigateur moderne** avec WebGL et WebSocket

### Dépendances Principales
- **Three.js** r128+ (Rendu 3D)
- **Cannon.js** 0.20+ (Physique)
- **Socket.IO** 4.7+ (WebSockets)
- **Express** 4.18+ (Serveur web)

## 🛠️ Installation

### Prérequis
- Node.js 14+ ([Télécharger](https://nodejs.org/))
- NPM ou Yarn

### 1. Cloner le Repository
```bash
git clone https://github.com/mayeulperrin/brawlsoccer.git
cd brawlsoccer
```

### 2. Installer les Dépendances
```bash
npm install
```

### 3. Méthodes de Démarrage

#### 🏃 Développement (démarrage simple)
```bash
npm start
```

#### 🚀 Production (avec PM2 - recommandé)
```bash
# Installer PM2 globalement
npm install -g pm2

# Déploiement automatique
./pm2-deploy.sh prod

# Ou manuellement
npm run build
cd dist && pm2 start server.js --name "brawlsoccer"
```

### 4. Ouvrir le Jeu
Ouvrez votre navigateur et allez à : **http://localhost:3000**

> 💡 **Pour la production, utilisez PM2** pour une meilleure stabilité et gestion automatique des redémarrages. Voir [PM2_README.md](./PM2_README.md) pour le guide complet.

## 🎮 Contrôles

### 🖱️ Mouvements
- **Z** ou **↑** : Avancer
- **S** ou **↓** : Reculer  
- **Q** ou **←** : Aller à gauche
- **D** ou **→** : Aller à droite

### 👊 Actions
- **Espace** ou **Clic souris** : Coup de poing
- **Pieds automatiques** : Le ballon se déplace quand vous le touchez

### ⌨️ Raccourcis
- **Échap** : Afficher/masquer les contrôles
- **F1** : Informations de debug
- **F11** : Plein écran
- **Ctrl+M** : Couper/remettre le son

## 🏗️ Architecture Technique

### 📁 Structure des Fichiers
```
soccerbox/
├── server.js              # Serveur Node.js principal
├── package.json           # Configuration npm
└── public/
    ├── index.html         # Page web principale
    └── js/
        ├── main.js        # Point d'entrée et coordination
        ├── game.js        # Moteur 3D avec Three.js
        ├── physics.js     # Système physique Cannon.js
        ├── network.js     # Communication WebSocket
        └── ui.js          # Gestionnaire d'interface
```

### 🔧 Modules Principaux

#### 🖥️ Serveur (server.js)
- Gestion des connexions WebSocket
- Synchronisation de l'état du jeu
- Logique de collision et scoring
- Attribution des équipes
- Boucle de jeu à 60 FPS

#### 🎮 Client 3D (game.js)
```javascript
class SoccerBoxGame {
    - Scène Three.js avec terrain et éclairage
    - Création des modèles 3D (joueurs, ballon)
    - Gestion de la caméra qui suit le joueur
    - Animations et effets visuels
}
```

#### ⚡ Physique (physics.js)
```javascript
class PhysicsManager {
    - Monde Cannon.js avec gravité
    - Collisions réalistes ballon/joueurs/terrain
    - Matériaux physiques différenciés
    - Détection des buts et limites
}
```

#### 🌐 Réseau (network.js)
```javascript
class NetworkManager {
    - Communication Socket.IO bidirectionnelle
    - Buffers optimisés pour les mouvements
    - Gestion des événements multijoueurs
    - Effets visuels synchronisés
}
```

#### 🎨 Interface (ui.js)
```javascript
class UIManager {
    - Écrans de connexion et jeu
    - Mise à jour temps réel des scores
    - Liste des joueurs avec statuts
    - Messages et notifications
}
```

## 🔧 Configuration Avancée

### 🌐 Variables d'Environnement
```bash
# Port du serveur (défaut: 3000)
PORT=3000

# Mode debug (true/false)
DEBUG=false

# Nombre max de joueurs (défaut: 8)
MAX_PLAYERS=8
```

### ⚙️ Paramètres Serveur
Dans `server.js`, vous pouvez modifier :
```javascript
const gameState = {
    maxPlayers: 8,        // Joueurs maximum
    gameTime: 0,          // Durée d'une partie
    score: { blue: 0, red: 0 }
};

// Paramètres physiques
const punchDamage = 25;   // Dégâts par coup
const punchRange = 3;     // Portée des coups
const kickForce = 10;     // Force des tirs
```

### 🎮 Paramètres Client
Dans `game.js`, personnalisez :
```javascript
// Caméra
this.camera.fov = 75;           // Champ de vision
this.camera.position.set(0, 25, 30);

// Rendu
this.renderer.shadowMap.enabled = true;  // Ombres
this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
```

## 🐛 Debug et Développement

### 🛠️ Commandes Console
Ouvrez F12 et utilisez :
```javascript
// État complet du jeu
debug.app.getGameState()

// Téléporter votre joueur
debug.teleport(10, 5)

// Statistiques de performance
debug.perf()

// État de la connexion réseau
debug.network()

// Redémarrer le jeu
debug.restart()

// Aide complète
debug.help()
```

### 📊 Monitoring Performance
- FPS en temps réel affiché avec F1
- Alertes automatiques si FPS < 30
- Statistiques WebGL (triangles, appels de rendu)
- Moniteur de latence réseau

### 🚨 Gestion d'Erreurs
- Récupération automatique en cas de perte WebGL
- Reconnexion automatique WebSocket
- Écrans d'erreur informatifs
- Logs détaillés en console

## 🚀 Déploiement

### 🐳 Docker (Recommandé)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build et lancement
docker build -t soccerbox .
docker run -p 3000:3000 soccerbox
```

### ☁️ Heroku
```bash
# Préparation
echo "node_modules/" > .gitignore
git init && git add . && git commit -m "Initial commit"

# Déploiement
heroku create soccerbox-game
git push heroku main
```

### 🌐 Serveur VPS
```bash
# Sur votre serveur
git clone <votre-repo>
cd soccerbox
npm install --production
pm2 start server.js --name soccerbox
pm2 startup && pm2 save
```

## 🔮 Améliorations Futures

### 🎨 Graphismes Avancés
- [ ] **Modèles 3D réalistes** avec animations squelettiques
- [ ] **Textures haute définition** pour terrain et personnages  
- [ ] **Système de particules** pour effets météo (pluie, neige)
- [ ] **Post-processing** : bloom, motion blur, SSAO
- [ ] **Skins personnalisables** : maillots, gants, chaussures
- [ ] **Stade dynamique** : tribunes animées, écrans géants

### ⚡ Gameplay Enrichi
- [ ] **Compétences spéciales** : coup de poing chargé, sprint, esquive
- [ ] **Power-ups** : ballon rapide, force doublée, invincibilité
- [ ] **Modes de jeu** : 1v1, 3v3, roi de la colline, capture du drapeau
- [ ] **Système de ranking** : ELO, ligues, saisons
- [ ] **Statistiques détaillées** : buts, K.O., distance parcourue
- [ ] **Replay system** : revoir les meilleurs moments

### 🌐 Multijoueur Avancé
- [ ] **Salles privées** avec mot de passe et invitations
- [ ] **Matchmaking** automatique par niveau
- [ ] **Tournois** : éliminatoires, brackets, récompenses
- [ ] **Système d'équipes** : création, invitation, chat vocal
- [ ] **Spectateur mode** : regarder les parties en cours
- [ ] **Anti-triche** : validation côté serveur, détection d'anomalies

### 🎵 Audio Immersif
- [ ] **Musique dynamique** qui s'adapte à l'action
- [ ] **Sons spatialisés 3D** : bruits de pas, coups, ballon
- [ ] **Commentaires automatiques** : "But fantastique !", "K.O. brutal !"
- [ ] **Chat vocal** intégré avec push-to-talk
- [ ] **Ambiance stade** : supporters, sifflets, encouragements

### 📱 Interface Moderne
- [ ] **Progressive Web App** (PWA) : installation, notifications
- [ ] **Support manette** : Xbox, PlayStation, générique
- [ ] **Interface mobile** optimisée avec contrôles tactiles
- [ ] **Thèmes personnalisables** : sombre, coloré, minimaliste
- [ ] **Accessibilité** : daltonisme, malvoyance, raccourcis
- [ ] **Multi-langue** : français, anglais, espagnol...

### 🏗️ Architecture Robuste
- [ ] **Base de données** : profils joueurs, statistiques, scores
- [ ] **API REST** : gestion comptes, classements, tournois
- [ ] **Load balancing** : plusieurs serveurs pour gérer la charge
- [ ] **Système de plugins** : mods communautaires
- [ ] **Analytics** : télémétrie, crash reporting, A/B testing
- [ ] **CI/CD** : tests automatisés, déploiement continu

### 🎮 Plateformes Étendues
- [ ] **Application mobile** React Native : iOS et Android
- [ ] **Application desktop** Electron : Windows, Mac, Linux
- [ ] **VR/AR** : support Oculus, HTC Vive pour immersion totale
- [ ] **Console** : adaptation pour Nintendo Switch
- [ ] **Smart TV** : contrôles simplifiés pour salon

## 🤝 Contribution

### 📋 Comment Contribuer
1. **Fork** le repository
2. **Créer** une branche pour votre feature : `git checkout -b feature/amazing-feature`
3. **Commit** vos changements : `git commit -m 'Add amazing feature'`
4. **Push** vers la branche : `git push origin feature/amazing-feature`
5. **Ouvrir** une Pull Request

### 🐛 Reporter un Bug
Utilisez les **Issues GitHub** avec :
- Description détaillée du problème
- Étapes pour reproduire
- Screenshots/vidéos si applicable
- Informations système (OS, navigateur, version)

### 💡 Suggérer des Améliorations
- Ouvrez une **Issue** avec le label `enhancement`
- Décrivez clairement l'idée et ses bénéfices
- Proposez une implémentation si possible

## 📝 License

Ce projet est sous licence **MIT**. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- **Three.js** : Moteur 3D fantastique
- **Cannon.js** : Physique réaliste et performante  
- **Socket.IO** : WebSockets simplifiés et robustes
- **Node.js** : Runtime serveur efficace
- **Community** : Tous les contributeurs et testeurs

---

<div align="center">

**🎮 Amusez-vous bien avec SoccerBox ! 🎮**

*Made with ❤️ and ⚽*

</div>