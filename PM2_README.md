# 🚀 PM2 - Guide d'utilisation pour BrawlSoccer

PM2 est un gestionnaire de processus pour applications Node.js qui permet de faire tourner votre jeu BrawlSoccer en arrière-plan avec une haute disponibilité.

## 📋 Table des matières

- [Installation](#installation)
- [Démarrage rapide](#démarrage-rapide)
- [Gestion des processus](#gestion-des-processus)
- [Surveillance et logs](#surveillance-et-logs)
- [Configuration avancée](#configuration-avancée)
- [Déploiement production](#déploiement-production)
- [Dépannage](#dépannage)

## 🔧 Installation

### Installation globale de PM2
```bash
npm install -g pm2
```

### Vérification de l'installation
```bash
pm2 --version
```

## 🚀 Démarrage rapide

### 1. Compiler votre application
```bash
# Depuis la racine du projet
npm run build
```

### 2. Démarrer avec PM2
```bash
cd dist
pm2 start server.js --name "brawlsoccer"
```

### 3. Vérifier le statut
```bash
pm2 status
```

Vous devriez voir quelque chose comme :
```
┌─────┬─────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name        │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼─────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ brawlsoccer │ default     │ 1.0.0   │ fork    │ 12345    │ 2m     │ 0    │ online    │ 0.1%     │ 45.2mb   │ user     │ disabled │
└─────┴─────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

## 🎛️ Gestion des processus

### Commandes principales

#### Démarrer une application
```bash
pm2 start server.js --name "brawlsoccer"
```

#### Arrêter une application
```bash
pm2 stop brawlsoccer
```

#### Redémarrer une application
```bash
pm2 restart brawlsoccer
```

#### Supprimer une application de PM2
```bash
pm2 delete brawlsoccer
```

#### Recharger (0 downtime)
```bash
pm2 reload brawlsoccer
```

### Options de démarrage avancées

#### Avec surveillance des fichiers
```bash
pm2 start server.js --name "brawlsoccer" --watch
```

#### Avec variables d'environnement
```bash
pm2 start server.js --name "brawlsoccer" --env production
```

#### Mode cluster (plusieurs instances)
```bash
pm2 start server.js --name "brawlsoccer" -i 4  # 4 instances
pm2 start server.js --name "brawlsoccer" -i max  # Une instance par CPU
```

#### Avec mémoire maximale
```bash
pm2 start server.js --name "brawlsoccer" --max-memory-restart 500M
```

## 📊 Surveillance et logs

### Voir les logs en temps réel
```bash
pm2 logs brawlsoccer
```

### Voir les logs des 50 dernières lignes
```bash
pm2 logs brawlsoccer --lines 50
```

### Monitoring en temps réel
```bash
pm2 monit
```

### Informations détaillées
```bash
pm2 show brawlsoccer
```

### Vider les logs
```bash
pm2 flush brawlsoccer
```

## ⚙️ Configuration avancée

### Créer un fichier ecosystem.config.js

Créez un fichier `ecosystem.config.js` dans votre répertoire :

```javascript
module.exports = {
  apps: [
    {
      name: 'brawlsoccer',
      script: 'server.js',
      cwd: './dist',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
```

### Utiliser la configuration
```bash
# Démarrer avec la config
pm2 start ecosystem.config.js

# Démarrer en mode production
pm2 start ecosystem.config.js --env production
```

## 🏭 Déploiement production

### 1. Sauvegarder la configuration
```bash
pm2 save
```

### 2. Configurer le démarrage automatique
```bash
pm2 startup
```

Suivez les instructions affichées (généralement une commande sudo à exécuter).

### 3. Exemple complet pour production

```bash
# 1. Compiler l'application
npm run build

# 2. Aller dans le dossier dist
cd dist

# 3. Installer les dépendances de production
npm install --production

# 4. Démarrer avec PM2
pm2 start server.js --name "brawlsoccer-prod" \
  --max-memory-restart 200M \
  --env production \
  --log-date-format "YYYY-MM-DD HH:mm:ss Z"

# 5. Sauvegarder
pm2 save

# 6. Configurer auto-start
pm2 startup
```

### 4. Script de déploiement automatique

Créez un script `deploy.sh` :

```bash
#!/bin/bash

echo "🚀 Déploiement BrawlSoccer avec PM2"

# Arrêter l'ancienne version
pm2 stop brawlsoccer-prod 2>/dev/null || echo "Aucune version en cours"

# Compiler
npm run build

# Aller dans dist et installer
cd dist
npm install --production

# Démarrer la nouvelle version
pm2 start server.js --name "brawlsoccer-prod" \
  --max-memory-restart 200M \
  --env production

# Sauvegarder
pm2 save

echo "✅ Déploiement terminé"
pm2 status
```

## 📈 Monitoring et performance

### Métriques système
```bash
pm2 monit
```

### Informations système
```bash
pm2 info brawlsoccer
```

### Statistiques CPU/Mémoire
```bash
pm2 list
```

### Monitoring web (optionnel)
```bash
# Installer PM2 web monitoring
pm2 install pm2-server-monit

# Ou utiliser Keymetrics (service payant)
pm2 monitor
```

## 🔄 Gestion des mises à jour

### Mise à jour sans interruption (cluster mode)
```bash
pm2 reload brawlsoccer
```

### Mise à jour avec interruption brève
```bash
pm2 restart brawlsoccer
```

### Mise à jour complète
```bash
# 1. Compiler la nouvelle version
npm run build

# 2. Redémarrer
pm2 restart brawlsoccer

# 3. Ou pour zero-downtime si cluster
pm2 reload brawlsoccer
```

## 🆘 Dépannage

### L'application ne démarre pas
```bash
# Vérifier les logs d'erreur
pm2 logs brawlsoccer --err

# Informations détaillées
pm2 show brawlsoccer

# Redémarrer
pm2 restart brawlsoccer
```

### Port déjà utilisé
```bash
# Voir quel processus utilise le port
lsof -i :3000

# Tuer les processus PM2
pm2 kill

# Redémarrer
pm2 resurrect
```

### Application qui consomme trop de mémoire
```bash
# Limiter la mémoire
pm2 restart brawlsoccer --max-memory-restart 200M
```

### Voir les processus zombies
```bash
pm2 list
pm2 cleanup  # Nettoie les processus morts
```

### Réinitialiser complètement PM2
```bash
pm2 kill           # Tue tout
pm2 resurrect       # Relance les apps sauvées
```

## 📝 Commandes utiles récapitulatives

| Commande | Description |
|----------|-------------|
| `pm2 start app.js --name "myapp"` | Démarrer une app avec un nom |
| `pm2 list` | Lister toutes les apps |
| `pm2 stop <name\|id>` | Arrêter une app |
| `pm2 restart <name\|id>` | Redémarrer une app |
| `pm2 delete <name\|id>` | Supprimer une app |
| `pm2 logs <name\|id>` | Voir les logs |
| `pm2 monit` | Monitoring temps réel |
| `pm2 save` | Sauvegarder la config |
| `pm2 startup` | Auto-démarrage système |
| `pm2 resurrect` | Relancer les apps sauvées |
| `pm2 kill` | Tuer le daemon PM2 |

## 🎮 Exemple spécifique BrawlSoccer

### Configuration recommandée pour BrawlSoccer

```bash
# Démarrage optimal pour BrawlSoccer
pm2 start server.js \
  --name "brawlsoccer" \
  --max-memory-restart 300M \
  --time \
  --merge-logs \
  --log-date-format "YYYY-MM-DD HH:mm:ss"

# Surveiller les performances
pm2 monit

# Voir les connexions WebSocket
pm2 logs brawlsoccer | grep "connecté\|déconnecté"
```

---

🎉 **Votre jeu BrawlSoccer est maintenant géré par PM2 comme un pro !**

Pour plus d'informations : [Documentation officielle PM2](https://pm2.keymetrics.io/)