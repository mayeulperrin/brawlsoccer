# 🚀 Guide de Déploiement BrawlSoccer sur Serveur Debian avec Apache

## 📋 Vue d'ensemble

Ce guide vous explique comment déployer BrawlSoccer sur votre serveur Debian **sans perturber** vos applications PHP/HTML existantes qui utilisent Apache.

## 🏗️ Architecture de déploiement

```
Port 80 (Apache) 
├── /                    → Applications PHP/HTML existantes
├── /brawlsoccer/        → BrawlSoccer (proxy vers port 3000)
└── /monapp/             → Autres applications PHP
```

## 🔧 Méthode Simple (Recommandée)

### 1. Préparer les fichiers sur votre machine locale

```bash
# Aller dans votre projet
cd /Users/mayeulperrin/Documents/Projects/brawlsoccer

# Compiler l'application
npm run build

# Créer une archive
tar -czf brawlsoccer-deploy.tar.gz dist/ server.js package.json deployment/ public/medias/
```

### 2. Transférer sur le serveur

```bash
# Copier l'archive sur votre serveur
scp brawlsoccer-deploy.tar.gz root@brawlsoccer.com:/tmp/

# Se connecter au serveur
ssh root@brawlsoccer.com
```

### 3. Installation sur le serveur

```bash
# Créer le répertoire de l'application
mkdir -p /var/www/brawlsoccer
cd /var/www/brawlsoccer

# Extraire l'archive
tar -xzf /tmp/brawlsoccer-deploy.tar.gz

# Installer Node.js si nécessaire
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt update && apt install -y nodejs

# Installer les dépendances
npm install --production

# Activer les modules Apache nécessaires
a2enmod proxy proxy_http proxy_wstunnel rewrite headers

# Copier la configuration Apache
cp deployment/apache.conf /etc/apache2/sites-available/brawlsoccer.conf

# Éditer la configuration avec votre domaine
nano /etc/apache2/sites-available/brawlsoccer.conf
# Le domaine brawlsoccer.com est déjà configuré

# Activer le site
a2ensite brawlsoccer

# Tester la configuration
apache2ctl configtest

# Recharger Apache
systemctl reload apache2
```

### 4. Créer le service systemd

```bash
# Copier le service
cp deployment/brawlsoccer.service /etc/systemd/system/

# Configurer les permissions
chown -R www-data:www-data /var/www/brawlsoccer
mkdir -p /var/log/brawlsoccer
chown www-data:www-data /var/log/brawlsoccer

# Activer et démarrer le service
systemctl daemon-reload
systemctl enable brawlsoccer
systemctl start brawlsoccer

# Vérifier que ça marche
systemctl status brawlsoccer
```

## 🎯 Configuration du domaine

Dans `/etc/apache2/sites-available/brawlsoccer.conf`, modifiez :

```apache
ServerName brawlsoccer.com
ServerAlias www.brawlsoccer.com
```

Configuration pour le domaine brawlsoccer.com.

## 🔍 Vérifications

### Tester l'application Node.js directement
```bash
curl http://localhost:3000
```

### Tester via Apache
```bash
curl http://localhost/brawlsoccer/
# ou
curl http://brawlsoccer.com/brawlsoccer/
```

### Vérifier les logs
```bash
# Logs de l'application
journalctl -u brawlsoccer -f

# Logs Apache
tail -f /var/log/apache2/brawlsoccer_*.log

# Logs de l'application
tail -f /var/log/brawlsoccer/app.log
```

## 🔧 Commandes utiles

```bash
# Redémarrer BrawlSoccer
systemctl restart brawlsoccer

# Recharger Apache (sans couper les connexions)
systemctl reload apache2

# Voir l'état des services
systemctl status brawlsoccer apache2

# Voir les processus Node.js
ps aux | grep node
```

## 🛡️ Sécurité et firewall

```bash
# Ouvrir seulement les ports nécessaires
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp

# Le port 3000 reste fermé (interne seulement)
# ufw deny 3000/tcp (optionnel, déjà fermé par défaut)
```

## 📂 Structure finale

```
/var/www/
├── html/                    # Vos applications PHP existantes
│   ├── index.php
│   └── ...
└── brawlsoccer/            # Nouvelle application
    ├── server.js
    ├── package.json
    ├── public/
    └── node_modules/
```

## 🌐 URLs d'accès

- **Applications PHP existantes :** `http://brawlsoccer.com/`
- **BrawlSoccer :** `http://brawlsoccer.com/brawlsoccer/`
- **Autres apps PHP :** `http://brawlsoccer.com/monapp/`

## ⚠️ Points importants

1. **Aucune interruption** de vos applications existantes
2. **Port 3000** reste fermé au public (sécurité)
3. **Apache gère tout** sur le port 80
4. **WebSockets** supportés via proxy
5. **Applications PHP** continuent de fonctionner normalement

## 🆘 Dépannage

### L'application ne démarre pas
```bash
journalctl -u brawlsoccer --no-pager
```

### Erreur de proxy Apache
```bash
tail -f /var/log/apache2/error.log
```

### Port 3000 déjà utilisé
```bash
lsof -i :3000
# Tuer le processus si nécessaire
```

### WebSockets ne marchent pas
Vérifiez que le module `proxy_wstunnel` est activé :
```bash
a2enmod proxy_wstunnel
systemctl reload apache2
```

---

**🎉 Une fois terminé, votre jeu sera accessible sur :**
`http://brawlsoccer.com/brawlsoccer/`