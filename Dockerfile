# Utiliser une image Node.js officielle
FROM node:18-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install --production

# Copier le reste des fichiers de l'application
COPY . .

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S soccerbox -u 1001

# Changer la propriété des fichiers
RUN chown -R soccerbox:nodejs /app
USER soccerbox

# Exposer le port 3000
EXPOSE 3000

# Définir les variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Vérification de santé du conteneur
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Commande pour démarrer l'application
CMD ["npm", "start"]

# Métadonnées
LABEL maintainer="SoccerBox Team"
LABEL description="Jeu de football-boxe multijoueur 3D"
LABEL version="1.0.0"