# 🏗️ Architecture SoccerBox - Détails Techniques

## 📋 Vue d'Ensemble

SoccerBox est un jeu multijoueur temps réel qui combine :
- **Frontend** : Three.js + Cannon.js (3D + Physique)
- **Backend** : Node.js + Socket.IO (Serveur temps réel)
- **Communication** : WebSockets bidirectionnels
- **Déploiement** : Docker + Compose

## 🎯 Flux de Données

```
[Navigateur] ←→ [WebSocket] ←→ [Serveur Node.js] ←→ [Logique Jeu]
     ↓                                                      ↓
[Three.js Scene]                                    [État Global]
     ↓                                                      ↓
[Cannon.js Physics]                              [Synchronisation]
```

## 🔧 Modules Frontend

### 1. **game.js** - Moteur 3D
```javascript
- SoccerBoxGame : Classe principale
- Gestion scène Three.js (terrain, joueurs, ballon)
- Caméra qui suit le joueur local
- Animations et effets visuels
- Création dynamique des modèles 3D
```

### 2. **physics.js** - Physique Réaliste
```javascript
- PhysicsManager : Monde Cannon.js
- Matériaux différenciés (sol, ballon, joueurs)
- Collisions et rebonds réalistes
- Détection des buts et limites
- Téléportation et forces
```

### 3. **network.js** - Communication
```javascript
- NetworkManager : Client Socket.IO
- Buffers optimisés pour mouvements
- Gestion événements multijoueurs
- Effets visuels synchronisés
- Reconnexion automatique
```

### 4. **ui.js** - Interface Utilisateur
```javascript
- UIManager : Gestion complète UI
- Écrans responsive (connexion/jeu)
- Mise à jour temps réel scores
- Debug et statistiques
- Notifications et messages
```

### 5. **main.js** - Coordination Générale
```javascript
- SoccerBoxApp : Point d'entrée principal
- Boucle de jeu à 60 FPS
- Gestion erreurs et performance
- Commandes debug console
- Monitoring système
```

## 🖥️ Backend - Serveur

### **server.js** - Serveur Principal
```javascript
Gestion complète côté serveur :

Classes:
- Player : État joueur (position, santé, équipe)
- gameState : État global synchronisé

Fonctions clés:
- startGame() : Démarrage automatique parties
- updatePlayers() : Physique et collisions serveur
- updateBall() : Déplacement ballon réaliste
- checkGoal() : Détection buts et scores
- broadcastState() : Synchronisation clients
```

### Événements Socket.IO
```javascript
Entrée:                    Sortie:
├─ join-game              ├─ player-joined
├─ player-move            ├─ game-update
├─ player-punch           ├─ player-action
└─ disconnect             ├─ goal
                          ├─ game-end
                          └─ player-left
```

## 📊 État du Jeu Synchronisé

```javascript
gameState = {
    players: Map<id, Player> {
        id: string,
        name: string,
        team: 'blue'|'red',
        position: {x, y, z},
        rotation: number,
        health: 0-100,
        isKnockedOut: boolean
    },
    
    ball: {
        position: {x, y, z},
        velocity: {x, y, z},
        rotation: {x, y, z}
    },
    
    score: {
        blue: number,
        red: number
    },
    
    gameStarted: boolean,
    gameTime: number
}
```

## ⚡ Optimisations Performance

### Frontend
- **Frustum Culling** : Objets hors caméra non rendus
- **LOD (Level of Detail)** : Qualité adaptée à la distance
- **Object Pooling** : Réutilisation objets (particules, effets)
- **Buffer Geometry** : Géométries optimisées GPU
- **Texture Atlas** : Textures groupées
- **Movement Buffering** : Limite envois réseau (50ms)

### Backend
- **Delta Time** : Physique indépendante FPS
- **Spatial Partitioning** : Collisions optimisées
- **State Interpolation** : Mouvements fluides
- **Event Batching** : Groupement événements
- **Memory Pooling** : Réutilisation objets

### Réseau
- **WebSocket Compression** : Réduction bande passante
- **State Diffing** : Envoi uniquement changements
- **Client Prediction** : Mouvements anticipés
- **Lag Compensation** : Correction latence
- **Heartbeat** : Détection déconnexions

## 🔒 Sécurité

### Validation Serveur
```javascript
- Mouvements dans limites physiques
- Cooldown coups de poing (500ms)
- Rate limiting connexions
- Validation pseudo (regex)
- Anti-speed hack
```

### Protection Client
```javascript
- Désactivation clic droit
- Prévention copier/coller
- Obfuscation code (production)
- HTTPS obligatoire (production)
```

## 📈 Évolutivité

### Charge Serveur
- **1 Serveur** : ~50 joueurs simultanés
- **Load Balancer** : Répartition plusieurs serveurs
- **Room System** : Parties isolées (8 joueurs max)
- **Database** : Persistance profils/statistiques

### Monitoring
```javascript
Métriques surveillées :
- FPS client (alertes < 30)
- Latence réseau (ping)
- Mémoire utilisée
- Connexions actives
- Erreurs JavaScript
- Performance rendu
```

## 🚀 Déploiement Production

### Configuration Recommandée
```yaml
Serveur VPS:
- CPU : 2 cores minimum
- RAM : 2GB minimum
- Réseau : 100Mbps
- OS : Ubuntu 20.04 LTS

Docker Stack:
- Node.js 18 Alpine
- Nginx reverse proxy
- PM2 process manager
- Redis session store (optionnel)
```

### Variables d'Environnement
```bash
# Performance
NODE_ENV=production
MAX_PLAYERS=8
GAME_DURATION=300

# Réseau  
PORT=3000
CORS_ORIGIN=https://votre-domaine.com

# Sécurité
RATE_LIMIT=100
SESSION_SECRET=your-secret-key

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

## 🐛 Debug et Tests

### Commandes Console
```javascript
// État complet jeu
debug.app.getGameState()

// Téléporter joueur
debug.teleport(x, z)

// Performance temps réel
debug.perf()

// Réseau et latence
debug.network()

// Redémarrage complet
debug.restart()
```

### Tests Automatisés
```javascript
// Tests unitaires
npm test

// Tests intégration
npm run test:integration  

// Tests performance
npm run test:performance

// Tests charge
npm run test:load
```

### Profiling
```javascript
// Chrome DevTools
- Performance tab : FPS et bottlenecks
- Memory tab : Fuites mémoire
- Network tab : Trafic WebSocket

// Node.js Profiling
node --inspect server.js
```

## 📚 Ressources et Documentation

### APIs Utilisées
- **Three.js** : https://threejs.org/docs/
- **Cannon.js** : https://cannonjs.org/
- **Socket.IO** : https://socket.io/docs/
- **Express** : https://expressjs.com/

### Outils Développement
- **VS Code** : Extensions Three.js, Node.js
- **Chrome DevTools** : Debugging WebGL/WebSocket
- **Postman** : Tests API REST (futur)
- **Docker Desktop** : Containerisation locale

Cette architecture permet une extensibilité facile et des performances optimales pour un jeu multijoueur temps réel !