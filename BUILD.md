# SoccerBox - Scripts de Compilation

## 🏗️ Compilation de l'application

Cette application dispose de plusieurs méthodes pour créer une version de production optimisée.

## 📋 Méthodes disponibles

### 1. Via npm (Recommandé)
```bash
npm run build
```
ou
```bash
npm run compile
```

### 2. Via les scripts shell

**Linux/Mac :**
```bash
./compile.sh
```

**Windows :**
```batch
compile.bat
```

### 3. Directement avec Node.js
```bash
node build.js
```

## 🎯 Ce que fait la compilation

### ✨ Optimisations appliquées :
- **Minification HTML** : Suppression des espaces et commentaires
- **Minification CSS** : Compression des styles (si présents)  
- **Minification JavaScript** : Compression des fichiers JS
- **Copie sélective** : Seuls les fichiers nécessaires sont copiés
- **Package.json optimisé** : Scripts de production uniquement

### 📦 Structure de sortie (`dist/`) :
```
dist/
├── server.js              # Serveur Node.js
├── package.json           # Dépendances de production
├── start.sh              # Script de démarrage Linux/Mac  
├── start.bat             # Script de démarrage Windows
├── README.md             # Instructions de déploiement
└── public/               # Fichiers web optimisés
    ├── index.html        # (minifié)
    ├── js/               # JavaScript minifié
    │   ├── game.js
    │   ├── network.js
    │   ├── physics.js
    │   └── ...
    ├── medias/           # Sons et ressources
    │   ├── kick/
    │   ├── goal/
    │   └── ko/
    └── cannon.min.js     # Librairies externes
```

## 🚀 Déploiement de la version compilée

1. **Compiler l'application :**
   ```bash
   npm run build
   ```

2. **Aller dans le dossier de distribution :**
   ```bash
   cd dist
   ```

3. **Installer les dépendances de production :**
   ```bash
   npm install
   ```

4. **Démarrer l'application :**
   
   **Méthode 1 - Scripts automatiques :**
   ```bash
   # Linux/Mac
   ./start.sh
   
   # Windows  
   start.bat
   ```
   
   **Méthode 2 - Commande npm :**
   ```bash
   npm start
   ```

5. **Ouvrir dans le navigateur :**
   ```
   http://localhost:3000
   ```

## 📊 Avantages de la version compilée

- ✅ **Taille réduite** : ~6% de compression moyenne
- ✅ **Performance** : Fichiers minifiés = chargement plus rapide
- ✅ **Production ready** : Optimisé pour le déploiement
- ✅ **Portable** : Dossier `dist/` autonome et déplaçable
- ✅ **Clean** : Seulement les fichiers nécessaires
- ✅ **Multi-plateforme** : Scripts pour Linux/Mac/Windows

## 🛠️ Personnalisation

### Modifier le script de compilation :
Éditez `build.js` pour :
- Ajouter d'autres optimisations
- Modifier les règles de minification  
- Inclure/exclure certains fichiers
- Changer la structure de sortie

### Ajouter des étapes de build :
Modifiez les scripts dans `package.json` :
```json
{
  "scripts": {
    "build": "node build.js",
    "build:prod": "NODE_ENV=production node build.js",
    "build:dev": "node build.js --dev"
  }
}
```

## 🔧 Dépannage

### Erreur "Node.js not found" :
Installez Node.js depuis [nodejs.org](https://nodejs.org/)

### Erreur de permissions (Linux/Mac) :
```bash
chmod +x compile.sh build.js
```

### Problème de compilation :
Vérifiez que tous les fichiers sources sont présents :
- `server.js`
- `public/index.html`
- `public/js/*.js`
- `package.json`

## 📈 Statistiques de compilation

Le script affiche automatiquement :
- 📊 Taille avant/après compilation
- 🗜️ Taux de compression
- ⏱️ Temps de compilation
- 📁 Emplacement des fichiers générés

---

*Généré automatiquement par le système de build SoccerBox*