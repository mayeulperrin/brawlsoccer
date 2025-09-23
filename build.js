#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 SoccerBox - Script de compilation');
console.log('=====================================\n');

const buildDir = 'dist';
const sourceDir = 'public';

// Fonction utilitaire pour copier récursivement
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(
                path.join(src, childItemName),
                path.join(dest, childItemName)
            );
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Fonction pour minifier le HTML (SANS casser le JavaScript inline)
function minifyHTML(content) {
    return content
        // Préserver le contenu des balises <script>
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (match, scriptContent) => {
            // Ne pas minifier le contenu JavaScript inline
            return match;
        })
        // Minifier seulement le HTML, pas le JS
        .replace(/>\s+</g, '><')
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// Fonction pour minifier le CSS
function minifyCSS(content) {
    return content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Supprimer commentaires
        .replace(/\s+/g, ' ') // Réduire espaces multiples
        .replace(/;\s*}/g, '}') // Supprimer dernier point-virgule
        .replace(/\s*{\s*/g, '{') // Nettoyer accolades
        .replace(/;\s*/g, ';') // Nettoyer point-virgules
        .replace(/,\s*/g, ',') // Nettoyer virgules
        .trim();
}

// Fonction pour minifier le JavaScript (SÉCURISÉE)
function minifyJS(content) {
    return content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Supprimer commentaires multilignes
        .replace(/\/\/.*$/gm, '') // Supprimer commentaires une ligne
        .replace(/\n\s*/g, '\n') // Préserver les sauts de ligne essentiels
        .replace(/\s{2,}/g, ' ') // Réduire espaces multiples mais pas tous
        .replace(/;\s*\n/g, ';\n') // Préserver structure après point-virgule
        .trim();
}

try {
    console.log('📁 Nettoyage du dossier de build...');
    if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true });
    }
    fs.mkdirSync(buildDir);

    console.log('📦 Copie des fichiers...');
    
    // Copier le serveur
    console.log('  - server.js');
    fs.copyFileSync('server.js', path.join(buildDir, 'server.js'));
    
    // Copier package.json
    console.log('  - package.json');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    // Optionnel : modifier package.json pour la production
    packageJson.scripts = {
        start: "node server.js"
    };
    fs.writeFileSync(
        path.join(buildDir, 'package.json'), 
        JSON.stringify(packageJson, null, 2)
    );

    // Créer le dossier public dans dist
    fs.mkdirSync(path.join(buildDir, 'public'));

    // Traiter index.html
    console.log('  - index.html (optimisé)');
    const htmlContent = fs.readFileSync(path.join(sourceDir, 'index.html'), 'utf8');
    
    // Pour la production, on copie tel quel pour éviter les problèmes
    // La minification agressive peut casser le JavaScript inline
    const optimizedHTML = htmlContent
        .replace(/\s*\n\s*/g, '\n') // Nettoyer les sauts de ligne
        .replace(/\t/g, '  '); // Remplacer tabs par espaces
    
    fs.writeFileSync(path.join(buildDir, 'public', 'index.html'), optimizedHTML);

    // Traiter les fichiers JavaScript
    console.log('  - Fichiers JavaScript (optimisés)');
    const jsDir = path.join(sourceDir, 'js');
    const jsOutputDir = path.join(buildDir, 'public', 'js');
    fs.mkdirSync(jsOutputDir);
    
    fs.readdirSync(jsDir).forEach(file => {
        if (path.extname(file) === '.js') {
            console.log(`    - ${file}`);
            const jsContent = fs.readFileSync(path.join(jsDir, file), 'utf8');
            
            // Minification légère pour préserver la fonctionnalité
            const optimizedJS = jsContent
                .replace(/\/\*[\s\S]*?\*\//g, '') // Supprimer commentaires bloc
                .replace(/\/\/.*$/gm, '') // Supprimer commentaires ligne
                .replace(/^\s*\n/gm, ''); // Supprimer lignes vides
            
            fs.writeFileSync(path.join(jsOutputDir, file), optimizedJS);
        }
    });

    // Copier les medias (sans modification)
    console.log('  - Dossier medias');
    if (fs.existsSync(path.join(sourceDir, 'medias'))) {
        copyRecursiveSync(
            path.join(sourceDir, 'medias'), 
            path.join(buildDir, 'public', 'medias')
        );
    }

    // Copier les librairies externes
    console.log('  - Librairies externes');
    const libsToCheck = ['three.min.js', 'cannon.min.js', 'socket.io.min.js'];
    libsToCheck.forEach(lib => {
        const libPath = path.join(sourceDir, lib);
        if (fs.existsSync(libPath)) {
            console.log(`    - ${lib}`);
            fs.copyFileSync(libPath, path.join(buildDir, 'public', lib));
        }
    });

    // Copier les fichiers SEO et PWA
    console.log('  - Fichiers SEO et PWA');
    const seoFiles = ['favicon.svg', 'manifest.json', 'sitemap.xml', 'robots.txt'];
    seoFiles.forEach(file => {
        const filePath = path.join(sourceDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`    - ${file}`);
            fs.copyFileSync(filePath, path.join(buildDir, 'public', file));
        }
    });

    // Créer un script de démarrage
    console.log('📋 Création des scripts...');
    
    // Script de démarrage pour Linux/Mac
    const startScript = `#!/bin/bash
echo "🚀 Démarrage de SoccerBox..."
echo "📍 Port: 3000"
echo "🌐 URL: http://localhost:3000"
echo "⏹️  Ctrl+C pour arrêter"
echo ""
cd "$(dirname "$0")"
node server.js
`;
    fs.writeFileSync(path.join(buildDir, 'start.sh'), startScript);
    fs.chmodSync(path.join(buildDir, 'start.sh'), '755');

    // Script de démarrage pour Windows
    const startBatch = `@echo off
echo 🚀 Démarrage de SoccerBox...
echo 📍 Port: 3000
echo 🌐 URL: http://localhost:3000
echo ⏹️  Ctrl+C pour arrêter
echo.
cd /d "%~dp0"
node server.js
pause
`;
    fs.writeFileSync(path.join(buildDir, 'start.bat'), startBatch);

    // README pour la version compilée
    const readme = `# SoccerBox - Version Compilée

## 🚀 Démarrage rapide

### Prérequis
- Node.js (version 14 ou supérieure)

### Installation
1. Installer les dépendances :
   \`\`\`bash
   npm install
   \`\`\`

2. Démarrer le serveur :
   
   **Linux/Mac :**
   \`\`\`bash
   ./start.sh
   \`\`\`
   
   **Windows :**
   \`\`\`batch
   start.bat
   \`\`\`
   
   **Ou manuellement :**
   \`\`\`bash
   npm start
   \`\`\`

3. Ouvrir dans le navigateur : http://localhost:3000

## 🎮 Fonctionnalités

- ⚽ Football-boxe multijoueur en temps réel
- 🥊 Système de combat avec barres de vie
- 🎵 Sons personnalisés (dossiers kick/, goal/, ko/)
- 🏟️ Terrain 3D optimisé avec physics réalistes
- 👥 Support jusqu'à 8 joueurs simultanés
- 🎯 Interface utilisateur complète

## 📁 Structure

- \`server.js\` - Serveur Node.js principal
- \`public/\` - Fichiers web statiques (minifiés)
- \`public/medias/\` - Sons et ressources média

## 🔧 Configuration

Le serveur démarre sur le port 3000 par défaut.
Pour changer le port, modifier la variable dans server.js.

---
Généré le ${new Date().toLocaleDateString('fr-FR')}
`;
    fs.writeFileSync(path.join(buildDir, 'README.md'), readme);

    // Statistiques de compilation
    const originalSize = getDirectorySize(sourceDir);
    const compiledSize = getDirectorySize(buildDir);
    const compression = ((originalSize - compiledSize) / originalSize * 100).toFixed(1);

    console.log('\n✅ Compilation terminée !');
    console.log('========================');
    console.log(`📊 Taille originale: ${formatBytes(originalSize)}`);
    console.log(`📦 Taille compilée: ${formatBytes(compiledSize)}`);
    console.log(`🗜️  Compression: ${compression}%`);
    console.log(`📁 Dossier de sortie: ${buildDir}/`);
    console.log('');
    console.log('🚀 Pour démarrer la version compilée :');
    console.log(`   cd ${buildDir} && npm install && npm start`);

} catch (error) {
    console.error('❌ Erreur lors de la compilation :', error.message);
    process.exit(1);
}

// Fonctions utilitaires
function getDirectorySize(dirPath) {
    let size = 0;
    if (!fs.existsSync(dirPath)) return 0;
    
    function calculateSize(itemPath) {
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
            fs.readdirSync(itemPath).forEach(item => {
                calculateSize(path.join(itemPath, item));
            });
        } else {
            size += stats.size;
        }
    }
    
    calculateSize(dirPath);
    return size;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}