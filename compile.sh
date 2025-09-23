#!/bin/bash

echo "🏗️  SoccerBox - Script de compilation"
echo "====================================="

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de log avec couleurs
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    log_error "Node.js n'est pas installé!"
    exit 1
fi

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
    log_error "npm n'est pas installé!"
    exit 1
fi

log_info "Node.js version: $(node --version)"
log_info "npm version: $(npm --version)"

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    log_info "Installation des dépendances..."
    npm install
    if [ $? -eq 0 ]; then
        log_success "Dépendances installées"
    else
        log_error "Erreur lors de l'installation des dépendances"
        exit 1
    fi
fi

# Exécuter le script de build
log_info "Lancement de la compilation..."
node build.js

if [ $? -eq 0 ]; then
    log_success "Compilation réussie!"
    echo ""
    echo "📦 L'application compilée se trouve dans le dossier 'dist/'"
    echo "🚀 Pour la démarrer :"
    echo "   cd dist"
    echo "   npm install"
    echo "   npm start"
    echo ""
    echo "🌐 Puis ouvrez: http://localhost:3000"
else
    log_error "Erreur lors de la compilation"
    exit 1
fi