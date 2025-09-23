#!/bin/bash
# Script de déploiement automatique pour BrawlSoccer
# deploy.sh - À exécuter sur le serveur Debian

set -e  # Arrêter en cas d'erreur

# Configuration
APP_NAME="brawlsoccer"
APP_DIR="/var/www/brawlsoccer"
SERVICE_NAME="brawlsoccer"
NGINX_SITE="multi-apps"
NODE_VERSION="18"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Vérifier que le script est exécuté en tant que root
if [[ $EUID -ne 0 ]]; then
   error "Ce script doit être exécuté en tant que root (sudo ./deploy.sh)"
fi

log "🚀 Début du déploiement de $APP_NAME"

# ===== 1. INSTALLATION DES DÉPENDANCES =====
log "📦 Installation des dépendances système..."

# Mise à jour du système
apt update && apt upgrade -y

# Installation de Node.js (via NodeSource)
if ! command -v node &> /dev/null; then
    log "Installation de Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi

# Installation d'autres dépendances nécessaires  
apt install -y apache2 php-fpm git curl unzip

success "Dépendances installées avec succès"

# ===== 2. PRÉPARATION DE L'APPLICATION =====
log "📁 Configuration de l'application..."

# Créer le répertoire de l'application
mkdir -p $APP_DIR
mkdir -p /var/log/brawlsoccer

# Si l'application existe déjà, faire un backup
if [ -d "$APP_DIR/node_modules" ]; then
    warning "Application existante trouvée, création d'un backup..."
    cp -r $APP_DIR ${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)
fi

# Copier les fichiers de l'application (à adapter selon votre méthode de transfert)
log "Copiez maintenant vos fichiers dans $APP_DIR"
log "Vous pouvez utiliser: rsync, scp, git clone, etc."

# Attendre la confirmation
read -p "Appuyez sur [Enter] une fois que les fichiers sont copiés dans $APP_DIR..."

# Vérifier que les fichiers sont présents
if [ ! -f "$APP_DIR/server.js" ]; then
    error "Fichier server.js non trouvé dans $APP_DIR"
fi

if [ ! -f "$APP_DIR/package.json" ]; then
    error "Fichier package.json non trouvé dans $APP_DIR"
fi

# ===== 3. INSTALLATION DES MODULES NODE =====
log "📦 Installation des modules Node.js..."
cd $APP_DIR
npm install --production

# Compilation si nécessaire
if [ -f "build.js" ]; then
    log "🔨 Compilation de l'application..."
    npm run build
fi

success "Application configurée avec succès"

# ===== 4. CONFIGURATION DU SERVICE SYSTEMD =====
log "⚙️ Configuration du service systemd..."

# Copier le fichier de service
cp deployment/brawlsoccer.service /etc/systemd/system/

# Recharger systemd
systemctl daemon-reload

# Activer le service
systemctl enable $SERVICE_NAME

success "Service systemd configuré"

# ===== 5. CONFIGURATION APACHE =====
log "🌐 Configuration d'Apache..."

# Activer les modules nécessaires
a2enmod proxy
a2enmod proxy_http
a2enmod proxy_wstunnel
a2enmod rewrite
a2enmod headers
a2enmod expires
a2enmod deflate

# Backup de la configuration existante si elle existe
APACHE_SITE="brawlsoccer"
if [ -f "/etc/apache2/sites-available/${APACHE_SITE}.conf" ]; then
    cp /etc/apache2/sites-available/${APACHE_SITE}.conf /etc/apache2/sites-available/${APACHE_SITE}_backup_$(date +%Y%m%d_%H%M%S).conf
fi

# Copier la nouvelle configuration
cp deployment/apache.conf /etc/apache2/sites-available/${APACHE_SITE}.conf

# Activer le site
a2ensite $APACHE_SITE

# Tester la configuration Apache
if apache2ctl configtest; then
    success "Configuration Apache valide"
else
    error "Erreur dans la configuration Apache"
fi

# ===== 6. PERMISSIONS ET SÉCURITÉ =====
log "🔒 Configuration des permissions..."

# Définir les bonnes permissions
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod +x $APP_DIR/start.sh 2>/dev/null || true

# Créer les dossiers de logs
mkdir -p /var/log/brawlsoccer
chown www-data:www-data /var/log/brawlsoccer

success "Permissions configurées"

# ===== 7. DÉMARRAGE DES SERVICES =====
log "🚀 Démarrage des services..."

# Démarrer BrawlSoccer
systemctl start $SERVICE_NAME
systemctl status $SERVICE_NAME --no-pager

# Recharger Apache
systemctl reload apache2

success "Services démarrés avec succès"

# ===== 8. VÉRIFICATIONS FINALES =====
log "🔍 Vérifications finales..."

# Vérifier que l'application répond
sleep 5
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    success "✅ BrawlSoccer répond correctement sur le port 3000"
else
    warning "⚠️  L'application ne répond pas encore, vérifiez les logs"
fi

# Afficher les informations finales
log "📋 Résumé du déploiement:"
echo "   • Application: $APP_DIR"
echo "   • Service: systemctl status $SERVICE_NAME"
echo "   • Logs app: journalctl -u $SERVICE_NAME -f"
echo "   • Logs Apache: tail -f /var/log/apache2/brawlsoccer_*.log"
echo "   • URL locale: http://localhost/brawlsoccer/"

success "🎉 Déploiement terminé avec succès!"

log "📝 Prochaines étapes:"
echo "   1. Configurez votre domaine dans /etc/apache2/sites-available/brawlsoccer.conf"
echo "   2. Activez HTTPS avec Let's Encrypt si nécessaire"
echo "   3. Configurez un firewall (ufw) si ce n'est pas déjà fait"
echo "   4. Testez l'accès: http://brawlsoccer.com/brawlsoccer/"