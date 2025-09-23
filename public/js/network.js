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
        this.movementCooldown = 50; // ms entre les envois de mouvement
        
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
            uiManager.showConnectionStatus('Connecté au serveur', 'success');
        });

        // Déconnexion
        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log('❌ Déconnecté du serveur:', reason);
            uiManager.showConnectionStatus('Connexion perdue', 'error');
            uiManager.showLoginScreen();
        });

        // Erreur de connexion
        this.socket.on('connect_error', (error) => {
            console.error('Erreur de connexion:', error);
            uiManager.showConnectionStatus('Erreur de connexion', 'error');
        });

        // Joueur rejoint avec succès
        this.socket.on('player-joined', (data) => {
            this.playerId = data.playerId;
            this.playerTeam = data.team;
            
            console.log(`🎮 Joueur rejoint - ID: ${this.playerId}, Équipe: ${this.playerTeam}`);
            
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
            uiManager.showConnectionStatus('Partie complète, réessayez plus tard', 'warning');
        });

        // Mise à jour de l'état du jeu
        this.socket.on('game-update', (gameState) => {
            game.updateGameState(gameState);
            uiManager.updateScore(gameState.score);
            uiManager.updatePlayersList(gameState.players);
        });

        // Mise à jour des joueurs
        this.socket.on('player-update', (gameState) => {
            game.updateGameState(gameState);
            uiManager.updatePlayersList(gameState.players);
        });

        // Joueur a quitté
        this.socket.on('player-left', (playerId) => {
            console.log(`👋 Joueur ${playerId} a quitté la partie`);
        });

        // Partie démarrée
        this.socket.on('game-started', () => {
            console.log('🚀 Partie démarrée !');
            game.showGameMessage('🚀 La partie commence !', 2000);
            uiManager.showGameStarted();
        });

        // Partie arrêtée
        this.socket.on('game-stopped', () => {
            console.log('⏹️ Partie arrêtée');
            game.showGameMessage('⏹️ Partie arrêtée - Pas assez de joueurs');
            uiManager.showGameStopped();
        });

        // Action de joueur (coup de poing, etc.)
        this.socket.on('player-action', (data) => {
            if (data.action === 'punch') {
                game.animatePunch(data.playerId);
                
                // Effet visuel
                this.showActionEffect(data.position, '👊');
            }
        });

        // Joueur touché
        this.socket.on('player-hit', (data) => {
            const { attackerId, targetId, damage, newHealth, knockout } = data;
            
            console.log(`💥 ${attackerId} frappe ${targetId} (${damage} dégâts, santé: ${newHealth})`);
            
            // Mettre à jour la barre de vie
            game.updatePlayerHealth(targetId, newHealth);
            
            // Effets visuels
            this.showHitEffect(targetId, damage);
            
            if (knockout) {
                const targetName = game.getPlayerNameById(targetId);
                game.showKOMessage(`💀 ${targetName} est K.O. !`, 2000);
                
                // Son de KO aléatoire
                this.playRandomSound('ko', 0.8);
            }
            
            // Son d'impact - son aléatoire de kick
            this.playRandomSound('kick', 0.6);
        });

        // Réapparition d'un joueur
        this.socket.on('player-respawn', (data) => {
            const { playerId, health } = data;
            
            console.log(`🔄 ${playerId} réapparaît avec ${health} PV`);
            
            // Mettre à jour la barre de vie à 100%
            game.updatePlayerHealth(playerId, health);
            
            // Pas de message visuel pour la réapparition
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
            this.playRandomSound('goal', 0.7);
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

    // Rejoindre une partie
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

    showHitEffect(playerId, damage) {
        const player = game.players.get(playerId);
        if (!player) return;

        // Effet de secousse
        const originalPosition = player.position.clone();
        const shakeIntensity = 0.2;
        const shakeDuration = 300;
        const startTime = Date.now();

        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= shakeDuration) {
                player.position.copy(originalPosition);
                return;
            }

            player.position.x = originalPosition.x + (Math.random() - 0.5) * shakeIntensity;
            player.position.z = originalPosition.z + (Math.random() - 0.5) * shakeIntensity;

            requestAnimationFrame(shake);
        };

        shake();

        // Afficher les dégâts
        this.showActionEffect(player.position, `-${damage}`);
    }

    showGoalEffect(team) {
        // Effet de particules pour célébrer le but
        const particleCount = 50;
        const particles = [];
        const color = team === 'blue' ? 0x4169E1 : 0xFF4500;

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color });
            const particle = new THREE.Mesh(geometry, material);

            particle.position.set(
                (Math.random() - 0.5) * 20,
                Math.random() * 10 + 5,
                (Math.random() - 0.5) * 10
            );

            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.1,
                (Math.random() - 0.5) * 0.2
            );

            game.scene.add(particle);
            particles.push(particle);
        }

        // Animation des particules
        const animateParticles = () => {
            particles.forEach((particle, index) => {
                particle.position.add(particle.velocity);
                particle.velocity.y -= 0.01; // Gravité

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

    // Système audio avec fichiers MP3
    playAudioFile(fileName, volume = 0.3) {
        try {
            const audio = new Audio(`medias/${fileName}`);
            audio.volume = volume;
            audio.play().catch(e => {
                console.log(`Son ${fileName} non disponible:`, e);
            });
        } catch (error) {
            console.log(`Erreur lecture son ${fileName}:`, error);
        }
    }

    // Jouer un son aléatoire depuis un dossier
    async playRandomSound(folder, volume = 0.5) {
        try {
            // Essayer de récupérer la liste des fichiers via une requête au serveur
            const response = await fetch(`/api/sounds/${folder}`);
            
            if (response.ok) {
                const files = await response.json();
                if (files && files.length > 0) {
                    // Choisir un fichier aléatoire
                    const randomFile = files[Math.floor(Math.random() * files.length)];
                    
                    const audio = new Audio(`medias/${folder}/${randomFile}`);
                    audio.volume = volume;
                    
                    audio.play().then(() => {
                        console.log(`🎵 Son aléatoire joué: ${folder}/${randomFile}`);
                    }).catch(e => {
                        console.log(`Erreur lecture ${randomFile}:`, e);
                    });
                    
                    return;
                }
            }
            
            // Fallback: essayer quelques noms de fichiers courants
            console.log(`⚠️ API non disponible, essai des fichiers courants dans ${folder}/`);
            await this.playRandomSoundFallback(folder, volume);
            
        } catch (error) {
            console.log(`❌ Erreur accès dossier ${folder}:`, error);
            // Fallback en cas d'erreur
            await this.playRandomSoundFallback(folder, volume);
        }
    }

    // Méthode de fallback qui teste des noms courants
    async playRandomSoundFallback(folder, volume = 0.5) {
        const commonNames = [
            '1.mp3', '2.mp3', '3.mp3', '4.mp3', '5.mp3',
            'sound1.mp3', 'sound2.mp3', 'sound3.mp3',
            `${folder}1.mp3`, `${folder}2.mp3`, `${folder}3.mp3`,
            'audio1.mp3', 'audio2.mp3', 'audio3.mp3',
            'a.mp3', 'b.mp3', 'c.mp3'
        ];
        
        // Mélanger les noms et essayer jusqu'à en trouver un qui fonctionne
        const shuffledNames = commonNames.sort(() => Math.random() - 0.5);
        
        for (const fileName of shuffledNames) {
            try {
                const audio = new Audio(`medias/${folder}/${fileName}`);
                audio.volume = volume;
                
                // Promesse pour tester si le fichier se charge
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 1000);
                    
                    audio.onloadeddata = () => {
                        clearTimeout(timeout);
                        resolve();
                    };
                    audio.onerror = () => {
                        clearTimeout(timeout);
                        reject(new Error('Load error'));
                    };
                    
                    audio.load();
                });
                
                // Si on arrive ici, le fichier existe
                audio.play().then(() => {
                    console.log(`🎵 Son fallback joué: ${folder}/${fileName}`);
                }).catch(e => {
                    console.log(`Erreur lecture fallback:`, e);
                });
                
                return; // Succès, sortir
                
            } catch (error) {
                // Continuer avec le fichier suivant
                continue;
            }
        }
        
        console.log(`❌ Aucun son trouvé dans medias/${folder}/`);
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