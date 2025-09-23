#!/bin/bash
# Script de déploiement PM2 pour BrawlSoccer
# Usage: ./pm2-deploy.sh [dev|prod]

set -e

# Configuration
APP_NAME="brawlsoccer"
BUILD_DIR="dist"
LOG_DIR="logs"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Fonctions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Banner
echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║         🚀 PM2 BRAWLSOCCER DEPLOY      ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Vérifier les arguments
ENV=${1:-dev}
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    error "Usage: $0 [dev|prod]"
fi

log "🎯 Environnement: $ENV"

# Vérifier que PM2 est installé
if ! command -v pm2 &> /dev/null; then
    error "PM2 n'est pas installé. Installez-le avec: npm install -g pm2"
fi

# Arrêter l'application si elle tourne
log "🛑 Arrêt de l'application existante..."
pm2 stop $APP_NAME 2>/dev/null || warning "Aucune application $APP_NAME en cours"
pm2 delete $APP_NAME 2>/dev/null || true

# Compilation
log "🔨 Compilation de l'application..."
npm run build || error "Échec de la compilation"
success "Application compilée"

# Créer les dossiers de logs
log "📁 Création des dossiers..."
mkdir -p $BUILD_DIR/$LOG_DIR
cd $BUILD_DIR

# Installer les dépendances de production
log "📦 Installation des dépendances..."
npm install --production --silent
success "Dépendances installées"

# Retourner à la racine
cd ..

# Démarrer avec PM2
log "🚀 Démarrage avec PM2..."

if [ "$ENV" = "prod" ]; then
    # Mode production
    pm2 start ecosystem.config.js --env production || error "Échec du démarrage en production"
    success "Application démarrée en mode PRODUCTION"
else
    # Mode développement
    pm2 start ecosystem.config.js --env development || error "Échec du démarrage en développement"
    success "Application démarrée en mode DÉVELOPPEMENT"
fi

# Sauvegarder la configuration
log "💾 Sauvegarde de la configuration PM2..."
pm2 save
success "Configuration sauvegardée"

# Afficher le statut
log "📊 Statut de l'application:"
pm2 status

# Afficher les informations
echo ""
log "📋 Informations de déploiement:"
echo "   • Application: $APP_NAME"
echo "   • Environnement: $ENV"
echo "   • Dossier: $(pwd)/$BUILD_DIR"
echo "   • URL: http://localhost:3000"
echo ""

log "🔧 Commandes utiles:"
echo "   • Logs temps réel: pm2 logs $APP_NAME"
echo "   • Monitoring: pm2 monit"
echo "   • Redémarrer: pm2 restart $APP_NAME"
echo "   • Arrêter: pm2 stop $APP_NAME"
echo ""

success "🎉 Déploiement terminé avec succès!"

# Tester que l'application répond
log "🔍 Test de l'application..."
sleep 3
if curl -f http://localhost:3000 &>/dev/null; then
    success "✅ Application accessible sur http://localhost:3000"
else
    warning "⚠️  Application non accessible, vérifiez les logs: pm2 logs $APP_NAME"
fi