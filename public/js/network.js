// network.js - Gestionnaire de réseau avec Socket.IO
class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.playerTeam = null;
        
        // Buffers pour optimiser les envois
        this.lastMovementSent = 0;
        this.movementBuffer = null;
        this.movementCooldown = 50; // Revenir à 50ms
        
        this.init();
    }

    init() {
        // Vérifier que Socket.IO est disponible
        if (typeof io === 'undefined') {
            console.error('❌ Socket.IO n\'est pas chargé !');
            throw new Error('Socket.IO is required but not loaded');
        }

        // Connexion au serveur Socket.IO
        this.socket = io();
        
        this.setupEventListeners();
        console.log('🌐 Gestionnaire réseau initialisé');
    }

    setupEventListeners() {
        // Connexion établie
        this.socket.on('connect', () => {
            this.connected = true;
            console.log('✅ Connecté au serveur');
            uiManager.clearConnectionTimeout(); // Annuler le timeout
            uiManager.showConnectionStatus('Connecté au serveur', 'success');
        });

        // Déconnexion
        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log('❌ Déconnecté du serveur:', reason);
            uiManager.clearConnectionTimeout(); // Annuler le timeout
            uiManager.showConnectionStatus('Connexion perdue', 'error');
            uiManager.showLoginScreen();
        });

        // Erreur de connexion
        this.socket.on('connect_error', (error) => {
            console.error('Erreur de connexion:', error);
            uiManager.clearConnectionTimeout(); // Annuler le timeout
            uiManager.showConnectionStatus('Erreur de connexion au serveur', 'error');
        });

        // Joueur rejoint avec succès
        this.socket.on('player-joined', (data) => {
            this.playerId = data.playerId;
            this.playerTeam = data.team;
            
            console.log(`🎮 Joueur rejoint - ID: ${this.playerId}, Équipe: ${this.playerTeam}`);
            
            // Annuler le timeout et cacher le statut de connexion
            uiManager.clearConnectionTimeout();
            uiManager.hideConnectionStatus();
            
            // Configurer le jeu
            game.setLocalPlayerId(this.playerId);
            game.updateGameState(data.gameState);
            
            // Mettre à jour l'interface
            uiManager.hideLoginScreen();
            uiManager.showGameUI();
            uiManager.updateScore(data.gameState.score);
            uiManager.updatePlayersList(data.gameState.players);
            
            game.showGameMessage(`Bienvenue dans l'équipe ${this.playerTeam === 'blue' ? 'Bleue' : 'Rouge'} !`);
        });

        // Partie pleine
        this.socket.on('game-full', () => {
            uiManager.clearConnectionTimeout(); // Annuler le timeout
            uiManager.showConnectionStatus('Partie complète, réessayez plus tard', 'warning');
        });

        // Pseudo déjà pris ou invalide
        this.socket.on('join-error', (error) => {
            uiManager.clearConnectionTimeout(); // Annuler le timeout
            uiManager.showConnectionStatus(error.message || 'Erreur de connexion', 'error');
        });

        // Mise à jour de l'état du jeu - RETOUR SIMPLE
        this.socket.on('game-update', (gameState) => {
            game.updateGameState(gameState);
            uiManager.updateScore(gameState.score);
            uiManager.updatePlayersList(gameState.players);
        });

        // Mise à jour des joueurs - RETOUR SIMPLE
        this.socket.on('player-update', (gameState) => {
            game.updateGameState(gameState);
            uiManager.updatePlayersList(gameState.players);
        });

        // Joueur touché - RETOUR SIMPLE
        this.socket.on('player-hit', (data) => {
            const { attackerId, targetId, damage, newHealth, knockout } = data;
            
            game.animatePunch(attackerId);

            // Mettre à jour la barre de vie
            if (game && game.updatePlayerData) {
                game.updatePlayerData(targetId, newHealth);
            }
            
            // Effets visuels
            this.showHitEffect(targetId, damage);
            
            if (knockout) {
                const targetName = game.getPlayerNameById(targetId);
                game.showKOMessage(`💀 ${targetName} est K.O. !`, 2000);
                
                // Son de KO
                this.playRandomSoundFallback('ko', 0.8);
            }
            
            // Son d'impact
            this.playRandomSoundFallback('kick', 0.6);
        });

        // Réapparition d'un joueur
        this.socket.on('player-respawn', (data) => {
            const { playerId, health } = data;
            
            // Mettre à jour la barre de vie à 100% - utiliser updatePlayerData qui existe
            if (game && game.updatePlayerData) {
                game.updatePlayerData(playerId, health);
            }
        });

        // But marqué
        this.socket.on('goal', (data) => {
            const { team, score } = data;
            const teamName = team === 'blue' ? 'Équipe Bleue' : 'Équipe Rouge';
            
            console.log(`⚽ But ! ${teamName} marque !`);
            
            // Mise à jour du score
            uiManager.updateScore(score);
            
            // Message de célébration
            game.showGameMessage(`⚽ BUT ! ${teamName} marque !`, 3000);
            
            // Effets visuels
            this.showGoalEffect(team);
            
            // Son de but - son aléatoire de goal
            this.playRandomSoundFallback('goal', 0.7);
        });

        // Fin de partie
        this.socket.on('game-end', (data) => {
            const { winner, finalScore } = data;
            const winnerName = winner === 'blue' ? 'Équipe Bleue' : 'Équipe Rouge';
            
            console.log(`🏆 Fin de partie ! ${winnerName} gagne !`);
            
            // Message de victoire/défaite
            const isWinner = this.playerTeam === winner;
            const message = isWinner ? 
                `🏆 VICTOIRE ! ${winnerName} gagne ${finalScore.blue}-${finalScore.red} !` :
                `😢 Défaite... ${winnerName} gagne ${finalScore.blue}-${finalScore.red}`;
            
            game.showGameMessage(message, 5000);
            uiManager.showGameEnd(winner, finalScore);
            
            // Plus de son automatique - seulement les sons des dossiers medias
        });

        // Événements de débogage
        this.socket.on('debug', (data) => {
            console.log('🐛 Debug:', data);
        });
    }

    // Rejoindre une partie - RETOUR SIMPLE
    joinGame(playerName) {
        if (!this.connected) {
            uiManager.showConnectionStatus('Connexion au serveur...', 'info');
            return;
        }

        if (!playerName || playerName.trim().length === 0) {
            uiManager.showConnectionStatus('Veuillez entrer un pseudo', 'warning');
            return;
        }

        console.log(`🚀 Tentative de connexion avec le pseudo: ${playerName}`);
        this.socket.emit('join-game', playerName.trim());
    }

    // Envoyer un mouvement de joueur
    sendPlayerMove(movement, rotation = 0) {
        if (!this.connected || !this.playerId) return;

        const now = Date.now();
        
        // Limiter la fréquence d'envoi pour éviter le spam
        if (now - this.lastMovementSent < this.movementCooldown) {
            this.movementBuffer = { movement, rotation };
            return;
        }

        this.socket.emit('player-move', {
            direction: movement,
            rotation: rotation,
            running: movement.shift || false // Course avec Shift
        });

        this.lastMovementSent = now;
        this.movementBuffer = null;
    }

    // Envoyer un coup de poing
    sendPlayerPunch() {
        if (!this.connected || !this.playerId) return;

        this.socket.emit('player-punch');
    }

    // Envoyer un coup de pied
    sendPlayerKick() {
        if (!this.connected || !this.playerId) return;

        this.socket.emit('player-kick');
    }

    // Envoyer un message de chat (future fonctionnalité)
    sendChatMessage(message) {
        if (!this.connected) return;

        this.socket.emit('chat-message', {
            playerId: this.playerId,
            message: message,
            timestamp: Date.now()
        });
    }

    // Effets visuels
    showActionEffect(position, emoji) {
        // Créer un sprite temporaire pour l'effet
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.position.set(position.x, position.y + 2, position.z);
        sprite.scale.set(2, 2, 1);
        
        game.scene.add(sprite);

        // Animation de disparition
        const startScale = 2;
        const duration = 1000;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                game.scene.remove(sprite);
                texture.dispose();
                spriteMaterial.dispose();
                return;
            }

            const scale = startScale * (1 - progress);
            sprite.scale.set(scale, scale, 1);
            sprite.position.y += 0.02; // Monte vers le haut
            spriteMaterial.opacity = 1 - progress;

            requestAnimationFrame(animate);
        };

        animate();
    }

    // OPTIMISATION: Réduire la complexité des effets visuels
    showHitEffect(playerId, damage) {
        const player = game.players.get(playerId);
        if (!player) return;

        // OPTIMISATION: Réduire la durée et l'intensité de la secousse
        const originalPosition = player.position.clone();
        const shakeIntensity = 0.05; // Réduire de 0.1 à 0.05
        let shakeFrames = 0;
        const maxFrames = 6; // Réduire de 10 à 6 frames

        const shake = () => {
            shakeFrames++;
            if (shakeFrames >= maxFrames) {
                player.position.copy(originalPosition);
                return;
            }

            const intensity = shakeIntensity * (1 - shakeFrames / maxFrames);
            player.position.x = originalPosition.x + (Math.random() - 0.5) * intensity;
            player.position.z = originalPosition.z + (Math.random() - 0.5) * intensity;

            requestAnimationFrame(shake);
        };

        shake();

        // OPTIMISATION: Afficher les dégâts seulement pour les très gros dégâts
        if (damage >= 30) { // Augmenter le seuil de 20 à 30
            this.showActionEffect(player.position, `-${damage}`);
        }
    }

    // OPTIMISATION: Effets de particules encore plus légers
    showGoalEffect(team) {
        const particleCount = 15; // Réduire encore de 20 à 15
        const particles = [];
        const color = team === 'blue' ? 0x4169E1 : 0xFF4500;

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.06, 4, 3); // Qualité encore plus basse
            const material = new THREE.MeshBasicMaterial({ color });
            const particle = new THREE.Mesh(geometry, material);

            particle.position.set(
                (Math.random() - 0.5) * 12, // Zone encore plus petite
                Math.random() * 6 + 2,
                (Math.random() - 0.5) * 6
            );

            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.06,
                (Math.random() - 0.5) * 0.1
            );

            game.scene.add(particle);
            particles.push(particle);
        }

        // Animation plus courte
        let frameCount = 0;
        const maxFrames = 45; // Réduire de 60 à 45 frames

        const animateParticles = () => {
            frameCount++;
            if (frameCount > maxFrames) {
                particles.forEach(particle => game.scene.remove(particle));
                return;
            }

            particles.forEach((particle, index) => {
                particle.position.add(particle.velocity);
                particle.velocity.y -= 0.006; // Gravité encore plus réduite

                if (particle.position.y < 0) {
                    game.scene.remove(particle);
                    particles.splice(index, 1);
                }
            });

            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };

        animateParticles();
    }

    // OPTIMISATION: Audio avec cache simple
    async playRandomSoundFallback(folder, volume = 0.5) {
        // Cache simple pour éviter de recharger les mêmes sons
        if (!this.audioCache) this.audioCache = {};
        const cacheKey = `${folder}_${volume}`;
        
        if (this.audioCache[cacheKey]) {
            this.audioCache[cacheKey].currentTime = 0;
            this.audioCache[cacheKey].play().catch(() => {});
            return;
        }

        const commonNames = ['1.mp3', '2.mp3', '3.mp3'];
        const randomFile = commonNames[Math.floor(Math.random() * commonNames.length)];
        
        try {
            const audio = new Audio(`medias/${folder}/${randomFile}`);
            audio.volume = volume;
            this.audioCache[cacheKey] = audio;
            
            audio.play().catch(() => {});
        } catch (error) {
            // Ignorer les erreurs audio
        }
    }



    // Traitement du buffer de mouvement
    processMovementBuffer() {
        if (this.movementBuffer) {
            this.sendPlayerMove(this.movementBuffer.movement, this.movementBuffer.rotation);
        }
    }

    // Statistiques de connexion
    getConnectionStats() {
        return {
            connected: this.connected,
            playerId: this.playerId,
            playerTeam: this.playerTeam,
            ping: this.socket ? this.socket.ping : null
        };
    }

    // Nettoyage
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.connected = false;
        this.playerId = null;
        this.playerTeam = null;
    }
}

// Instance globale du gestionnaire réseau
const networkManager = new NetworkManager();

// Traiter le buffer de mouvement à intervalles réguliers
setInterval(() => {
    networkManager.processMovementBuffer();
}, networkManager.movementCooldown);