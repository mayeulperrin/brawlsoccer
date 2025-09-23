#!/bin/bash
# Script de transfert simplifié pour serveur Apache
# quick-deploy.sh

set -e

# Configuration - MODIFIEZ CES VALEURS
SERVER_USER="invidia"  
SERVER_HOST="brawlsoccer.com"
SERVER_PORT="22"
DOMAIN="brawlsoccer.com"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Déploiement rapide de BrawlSoccer sur serveur Apache${NC}"

# Vérifications
if [ ! -f "server.js" ]; then
    echo "❌ Fichier server.js non trouvé. Exécutez depuis la racine du projet."
    exit 1
fi

echo "📋 Configuration:"
echo "   Serveur: $SERVER_USER@$SERVER_HOST:$SERVER_PORT"
echo "   Domaine: $DOMAIN"
echo ""

read -p "Continuer ? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 1. Compilation locale
echo -e "${BLUE}🔨 Compilation...${NC}"
npm run build 2>/dev/null || echo "Pas de build nécessaire"

# 2. Création de l'archive
echo -e "${BLUE}📦 Création de l'archive...${NC}"
tar -czf brawlsoccer-deploy.tar.gz \
    server.js package.json \
    deployment/ \
    $([ -d "dist" ] && echo "dist/" || echo "public/") \
    $([ -d "public/medias" ] && echo "public/medias")

echo -e "${GREEN}✅ Archive créée: brawlsoccer-deploy.tar.gz${NC}"

# 3. Transfert
echo -e "${BLUE}📤 Transfert vers le serveur...${NC}"
scp -P $SERVER_PORT brawlsoccer-deploy.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

# 4. Installation automatique
echo -e "${BLUE}🔧 Installation sur le serveur...${NC}"

ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST << EOF
set -e

echo "📁 Préparation des dossiers..."
mkdir -p /var/www/brawlsoccer
cd /var/www/brawlsoccer
tar -xzf /tmp/brawlsoccer-deploy.tar.gz

echo "📦 Installation Node.js si nécessaire..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt update && apt install -y nodejs
fi

echo "📚 Installation des dépendances..."
npm install --production

echo "🔧 Configuration Apache..."
a2enmod proxy proxy_http proxy_wstunnel rewrite headers expires deflate 2>/dev/null || true

# Personnaliser le domaine dans la config
sed -i "s/votre-domaine.com/$DOMAIN/g" deployment/apache.conf

cp deployment/apache.conf /etc/apache2/sites-available/brawlsoccer.conf
a2ensite brawlsoccer

echo "⚙️ Configuration du service..."
cp deployment/brawlsoccer.service /etc/systemd/system/
systemctl daemon-reload

echo "🔒 Permissions..."
chown -R www-data:www-data /var/www/brawlsoccer
mkdir -p /var/log/brawlsoccer
chown www-data:www-data /var/log/brawlsoccer

echo "🚀 Démarrage des services..."
systemctl enable brawlsoccer
systemctl start brawlsoccer

if apache2ctl configtest; then
    systemctl reload apache2
    echo "✅ Apache rechargé avec succès"
else
    echo "⚠️ Erreur de configuration Apache"
    exit 1
fi

echo ""
echo "🎉 Déploiement terminé !"
echo "🌐 Votre jeu est accessible sur: http://$DOMAIN/brawlsoccer/"
echo ""
echo "🔍 Commandes utiles:"
echo "   systemctl status brawlsoccer"
echo "   journalctl -u brawlsoccer -f"
echo "   tail -f /var/log/apache2/brawlsoccer_access.log"

rm -f /tmp/brawlsoccer-deploy.tar.gz
EOF

# Nettoyage local
rm -f brawlsoccer-deploy.tar.gz

echo ""
echo -e "${GREEN}🎊 Déploiement terminé avec succès !${NC}"
echo -e "${YELLOW}🌐 Testez votre jeu sur: http://$DOMAIN/brawlsoccer/${NC}"