# 📁 Dossier Deployment - BrawlSoccer

Ce dossier contient tous les fichiers nécessaires pour déployer BrawlSoccer sur un serveur Debian avec Apache.

## 📋 Fichiers inclus

### 🚀 **quick-deploy.sh** *(RECOMMANDÉ)*
**Script de déploiement automatique** - Fait tout en une seule commande
- Compile l'application localement
- Transfère vers le serveur
- Configure Apache et systemd
- Démarre les services

**Usage :**
```bash
./quick-deploy.sh
```

### 📖 **DEPLOY_APACHE.md**
**Guide détaillé** avec instructions manuelles étape par étape
- Configuration Apache
- Commandes de dépannage
- Architecture complète

### ⚙️ **apache.conf**
**Configuration Apache** - Virtual Host pour BrawlSoccer
- Proxy vers Node.js (port 3000)
- Support WebSockets
- Cohabitation avec apps PHP existantes

### 🔧 **brawlsoccer.service**
**Service systemd** - Gestion automatique de l'application
- Démarrage automatique
- Gestion des logs
- Redémarrage en cas de crash

### 🛠️ **deploy.sh**
**Script serveur** - Utilisation avancée pour installation sur le serveur uniquement
- Installation complète des dépendances
- Configuration système
- Sécurité et permissions

## 🎯 Utilisation recommandée

### Déploiement rapide (1 commande)
```bash
# 1. Modifier la config dans quick-deploy.sh
# 2. Lancer le déploiement
./quick-deploy.sh
```

### Déploiement manuel
```bash
# Suivre le guide détaillé
cat DEPLOY_APACHE.md
```

## 🌐 Résultat

Après déploiement, votre jeu sera accessible sur :
- **BrawlSoccer :** `http://brawlsoccer.com/brawlsoccer/`
- **Vos apps PHP :** `http://brawlsoccer.com/` *(inchangées)*