class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.playerTeam = null;
        this.lastMovementSent = 0;
        this.movementBuffer = null;
        this.movementCooldown = 50; 
        this.init();
    }
    init() {
        if (typeof io === 'undefined') {
            console.error('❌ Socket.IO n\'est pas chargé !');
            throw new Error('Socket.IO is required but not loaded');
        }
        this.socket = io();
        this.setupEventListeners();
        console.log('🌐 Gestionnaire réseau initialisé');
    }
    setupEventListeners() {
        this.socket.on('connect', () => {
            this.connected = true;
            console.log('✅ Connecté au serveur');
            uiManager.clearConnectionTimeout(); 
            uiManager.showConnectionStatus('Connecté au serveur', 'success');
        });
        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log('❌ Déconnecté du serveur:', reason);
            uiManager.clearConnectionTimeout(); 
            uiManager.showConnectionStatus('Connexion perdue', 'error');
            uiManager.showLoginScreen();
        });
        this.socket.on('connect_error', (error) => {
            console.error('Erreur de connexion:', error);
            uiManager.clearConnectionTimeout(); 
            uiManager.showConnectionStatus('Erreur de connexion au serveur', 'error');
        });
        this.socket.on('player-joined', (data) => {
            this.playerId = data.playerId;
            this.playerTeam = data.team;
            console.log(`🎮 Joueur rejoint - ID: ${this.playerId}, Équipe: ${this.playerTeam}`);
            uiManager.clearConnectionTimeout();
            uiManager.hideConnectionStatus();
            game.setLocalPlayerId(this.playerId);
            game.updateGameState(data.gameState);
            uiManager.hideLoginScreen();
            uiManager.showGameUI();
            uiManager.updateScore(data.gameState.score);
            uiManager.updatePlayersList(data.gameState.players);
            game.showGameMessage(`Bienvenue dans l'équipe ${this.playerTeam === 'blue' ? 'Bleue' : 'Rouge'} !`);
        });
        this.socket.on('game-full', () => {
            uiManager.clearConnectionTimeout(); 
            uiManager.showConnectionStatus('Partie complète, réessayez plus tard', 'warning');
        });
        this.socket.on('join-error', (error) => {
            uiManager.clearConnectionTimeout(); 
            uiManager.showConnectionStatus(error.message || 'Erreur de connexion', 'error');
        });
        this.socket.on('game-update', (gameState) => {
            game.updateGameState(gameState);
            uiManager.updateScore(gameState.score);
            uiManager.updatePlayersList(gameState.players);
        });
        this.socket.on('player-update', (gameState) => {
            game.updateGameState(gameState);
            uiManager.updatePlayersList(gameState.players);
        });
        this.socket.on('player-hit', (data) => {
            const { attackerId, targetId, damage, newHealth, knockout } = data;
            game.animatePunch(attackerId);
            if (game && game.updatePlayerData) {
                game.updatePlayerData(targetId, newHealth);
            }
            this.showHitEffect(targetId, damage);
            if (knockout) {
                const targetName = game.getPlayerNameById(targetId);
                game.showKOMessage(`💀 ${targetName} est K.O. !`, 2000);
                this.playRandomSoundFallback('ko', 0.8);
            }
            this.playRandomSoundFallback('kick', 0.6);
        });
        this.socket.on('player-respawn', (data) => {
            const { playerId, health } = data;
            if (game && game.updatePlayerData) {
                game.updatePlayerData(playerId, health);
            }
        });
        this.socket.on('goal', (data) => {
            const { team, score } = data;
            const teamName = team === 'blue' ? 'Équipe Bleue' : 'Équipe Rouge';
            console.log(`⚽ But ! ${teamName} marque !`);
            uiManager.updateScore(score);
            game.showGameMessage(`⚽ BUT ! ${teamName} marque !`, 3000);
            this.showGoalEffect(team);
            this.playRandomSoundFallback('goal', 0.7);
        });
        this.socket.on('game-end', (data) => {
            const { winner, finalScore } = data;
            const winnerName = winner === 'blue' ? 'Équipe Bleue' : 'Équipe Rouge';
            console.log(`🏆 Fin de partie ! ${winnerName} gagne !`);
            const isWinner = this.playerTeam === winner;
            const message = isWinner ? 
                `🏆 VICTOIRE ! ${winnerName} gagne ${finalScore.blue}-${finalScore.red} !` :
                `😢 Défaite... ${winnerName} gagne ${finalScore.blue}-${finalScore.red}`;
            game.showGameMessage(message, 5000);
            uiManager.showGameEnd(winner, finalScore);
        });
        this.socket.on('debug', (data) => {
            console.log('🐛 Debug:', data);
        });
    }
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
    sendPlayerMove(movement, rotation = 0) {
        if (!this.connected || !this.playerId) return;
        const now = Date.now();
        if (now - this.lastMovementSent < this.movementCooldown) {
            this.movementBuffer = { movement, rotation };
            return;
        }
        this.socket.emit('player-move', {
            direction: movement,
            rotation: rotation,
            running: movement.shift || false 
        });
        this.lastMovementSent = now;
        this.movementBuffer = null;
    }
    sendPlayerPunch() {
        if (!this.connected || !this.playerId) return;
        this.socket.emit('player-punch');
    }
    sendPlayerKick() {
        if (!this.connected || !this.playerId) return;
        this.socket.emit('player-kick');
    }
    sendChatMessage(message) {
        if (!this.connected) return;
        this.socket.emit('chat-message', {
            playerId: this.playerId,
            message: message,
            timestamp: Date.now()
        });
    }
    showActionEffect(position, emoji) {
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
            sprite.position.y += 0.02; 
            spriteMaterial.opacity = 1 - progress;
            requestAnimationFrame(animate);
        };
        animate();
    }
    showHitEffect(playerId, damage) {
        const player = game.players.get(playerId);
        if (!player) return;
        const originalPosition = player.position.clone();
        const shakeIntensity = 0.05; 
        let shakeFrames = 0;
        const maxFrames = 6; 
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
        if (damage >= 30) { 
            this.showActionEffect(player.position, `-${damage}`);
        }
    }
    showGoalEffect(team) {
        const particleCount = 15; 
        const particles = [];
        const color = team === 'blue' ? 0x4169E1 : 0xFF4500;
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.06, 4, 3); 
            const material = new THREE.MeshBasicMaterial({ color });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(
                (Math.random() - 0.5) * 12, 
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
        let frameCount = 0;
        const maxFrames = 45; 
        const animateParticles = () => {
            frameCount++;
            if (frameCount > maxFrames) {
                particles.forEach(particle => game.scene.remove(particle));
                return;
            }
            particles.forEach((particle, index) => {
                particle.position.add(particle.velocity);
                particle.velocity.y -= 0.006; 
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
    async playRandomSoundFallback(folder, volume = 0.5) {
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
        }
    }
    processMovementBuffer() {
        if (this.movementBuffer) {
            this.sendPlayerMove(this.movementBuffer.movement, this.movementBuffer.rotation);
        }
    }
    getConnectionStats() {
        return {
            connected: this.connected,
            playerId: this.playerId,
            playerTeam: this.playerTeam,
            ping: this.socket ? this.socket.ping : null
        };
    }
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.connected = false;
        this.playerId = null;
        this.playerTeam = null;
    }
}
const networkManager = new NetworkManager();
setInterval(() => {
    networkManager.processMovementBuffer();
}, networkManager.movementCooldown);