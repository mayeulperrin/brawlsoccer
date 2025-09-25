// ui.js - Gestionnaire d'interface utilisateur
class UIManager {
    constructor() {
        this.elements = {
            loginScreen: document.getElementById('loginScreen'),
            playerName: document.getElementById('playerName'),
            scoreBoard: document.getElementById('scoreBoard'),
            blueScore: document.getElementById('blueScore'),
            redScore: document.getElementById('redScore'),
            playersList: document.getElementById('playersList'),
            playersContent: document.getElementById('playersContent'),
            gameMessage: document.getElementById('gameMessage')
        };
        
        this.connectionStatus = null;
        this.init();
    }

    init() {
        this.createConnectionStatus();
        this.setupEventListeners();
        console.log('🎨 Gestionnaire UI initialisé');
    }

    createConnectionStatus() {
        // Créer un élément de statut de connexion
        this.connectionStatus = document.createElement('div');
        this.connectionStatus.id = 'connectionStatus';
        this.connectionStatus.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            padding: 10px 15px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 1000;
            display: none;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        document.body.appendChild(this.connectionStatus);
    }

    setupEventListeners() {
        // Entrée dans le champ pseudo
        if (this.elements.playerName) {
            this.elements.playerName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.joinGame();
                }
            });

            // Focus automatique sur le champ pseudo
            this.elements.playerName.focus();
        }

        // Bouton rejoindre partie
        const joinBtn = document.getElementById('joinGameBtn');
        if (joinBtn) {
            joinBtn.onclick = () => this.joinGame();
        }

        // Raccourcis clavier globaux
        document.addEventListener('keydown', (e) => {
            // F1 pour les statistiques (debug)
            if (e.key === 'F1') {
                e.preventDefault();
                this.showDebugInfo();
            }
        });

        // Redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            this.updateLayout();
        });
    }

    // Connexion au jeu
    joinGame() {
        const playerName = this.elements.playerName.value.trim();
        
        if (!playerName) {
            this.showConnectionStatus('Veuillez entrer un pseudo', 'warning');
            this.elements.playerName.focus();
            return;
        }

        if (playerName.length > 20) {
            this.showConnectionStatus('Pseudo trop long (max 20 caractères)', 'warning');
            return;
        }

        // Vérifier les caractères autorisés
        if (!/^[a-zA-Z0-9_-]+$/.test(playerName)) {
            this.showConnectionStatus('Pseudo invalide (lettres, chiffres, _ et - seulement)', 'warning');
            return;
        }

        networkManager.joinGame(playerName);
        this.showConnectionStatus('Connexion en cours...', 'info');
    }

    // NOUVEAU: Méthode pour annuler le timeout de connexion
    clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }

    // Afficher/masquer les écrans
    showLoginScreen() {
        this.elements.loginScreen.classList.remove('hidden');
        this.elements.scoreBoard.style.display = 'none';
        this.elements.playersList.style.display = 'none';
        this.elements.playerName.focus();
    }

    hideLoginScreen() {
        this.elements.loginScreen.classList.add('hidden');
    }

    showGameUI() {
        this.elements.scoreBoard.style.display = 'block';
        this.elements.playersList.style.display = 'block';
    }

    hideGameUI() {
        this.elements.scoreBoard.style.display = 'none';
        this.elements.playersList.style.display = 'none';
    }

    // Statut de connexion
    showConnectionStatus(message, type = 'info', duration = 3000) {
        const colors = {
            success: 'rgba(40, 167, 69, 0.9)',
            error: 'rgba(220, 53, 69, 0.9)',
            warning: 'rgba(255, 193, 7, 0.9)',
            info: 'rgba(23, 162, 184, 0.9)'
        };

        this.connectionStatus.textContent = message;
        this.connectionStatus.style.backgroundColor = colors[type] || colors.info;
        this.connectionStatus.style.display = 'block';

        // Masquer automatiquement après la durée spécifiée
        if (duration > 0) {
            setTimeout(() => {
                this.connectionStatus.style.display = 'none';
            }, duration);
        }
    }

    hideConnectionStatus() {
        this.connectionStatus.style.display = 'none';
    }

    // Mise à jour du score
    updateScore(score) {
        this.elements.blueScore.textContent = score.blue;
        this.elements.redScore.textContent = score.red;
    }

    // Liste des joueurs - Optimisation du cooldown pour plus de réactivité
    updatePlayersList(players) {
        const now = Date.now();
        
        // OPTIMISATION: Réduire encore le cooldown à 15ms pour plus de fluidité
        if (this.lastPlayersUpdate && (now - this.lastPlayersUpdate) < 15) {
            return;
        }
        
        // Nouveau système de hash simple
        const currentHash = this.generatePlayersHash(players);
        if (this.lastPlayersHash === currentHash) {
            return; // Pas de changement, pas de mise à jour
        }
        
        this.lastPlayersHash = currentHash;
        this.lastPlayersUpdate = now;
        
        this.elements.playersContent.innerHTML = '';
        
        // Grouper par équipe
        const teams = {
            blue: players.filter(p => p.team === 'blue'),
            red: players.filter(p => p.team === 'red')
        };

        // Afficher l'équipe bleue
        if (teams.blue.length > 0) {
            const blueTitle = document.createElement('h4');
            blueTitle.textContent = '🔵 Équipe Bleue';
            blueTitle.className = 'team-blue';
            this.elements.playersContent.appendChild(blueTitle);

            teams.blue.forEach(player => {
                this.addPlayerToList(player);
            });
        }

        // Afficher l'équipe rouge
        if (teams.red.length > 0) {
            const redTitle = document.createElement('h4');
            redTitle.textContent = '🔴 Équipe Rouge';
            redTitle.className = 'team-red';
            redTitle.style.marginTop = '10px';
            this.elements.playersContent.appendChild(redTitle);

            teams.red.forEach(player => {
                this.addPlayerToList(player);
            });
        }

        // Afficher le nombre total de joueurs
        const totalPlayers = players.length;
        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = 'margin-top: 10px; font-size: 12px; color: rgba(255, 255, 255, 0.8);';
        statusDiv.textContent = `${totalPlayers}/8 joueurs connectés`;
        this.elements.playersContent.appendChild(statusDiv);
    }

    // OPTIMISATION: Cache pour éviter les recalculs de hash
    generatePlayersHash(players) {
        let hash = 0;
        
        // Trier par ID pour consistance
        const sortedPlayers = players.slice().sort((a, b) => a.id.localeCompare(b.id));
        
        for (let player of sortedPlayers) {
            // OPTIMISATION: Tranches de santé plus larges pour réduire les changements
            const healthBracket = Math.floor(player.health / 10) * 10; // 10% au lieu de 5%
            const playerString = `${player.id}_${player.name}_${player.team}_${healthBracket}_${player.isKnockedOut ? 1 : 0}_${player.giveKOCount || 0}_${player.receiveKOCount || 0}`;
            
            // Hash simple mais efficace
            for (let i = 0; i < playerString.length; i++) {
                const char = playerString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convertir en 32 bits
            }
        }
        
        hash += players.length * 1000;
        return hash;
    }

    addPlayerToList(player) {
        const playerDiv = document.createElement('div');
        playerDiv.style.cssText = 'margin: 5px 0; padding: 5px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; font-size: 14px;';
        
        // Icônes de statut
        let statusIcon = '🟢';
        if (player.isKnockedOut) statusIcon = '💀';
        else if (player.health < 50) statusIcon = '🟡';
        else if (player.health < 25) statusIcon = '🔴';
        
        // Marquer le joueur local
        const isLocal = player.id === networkManager.playerId;
        const nameStyle = isLocal ? 'font-weight: bold; text-decoration: underline;' : '';
        
        // OPTIMISATION: Utiliser template literals plus efficace
        playerDiv.innerHTML = `
            <div style="${nameStyle}">
                ${statusIcon} ${player.name} ${isLocal ? '(Vous)' : ''}
            </div>
            <div style="font-size: 11px; color: rgba(255, 255, 255, 0.7);">
                ❤️ ${player.health}% | 🥊 ${player.giveKOCount || 0} KO | 💀 ${player.receiveKOCount || 0} subis
            </div>
        `;
        
        this.elements.playersContent.appendChild(playerDiv);
    }

    // Messages de jeu
    showGameStarted() {
        this.showGameMessage('🚀 La partie commence !', 2000);
    }

    showGameStopped() {
        this.showGameMessage('⏸️ Partie en pause - En attente de joueurs');
    }

    showGameEnd(winner, finalScore) {
        const isLocalWinner = networkManager.playerTeam === winner;
        const winnerName = winner === 'blue' ? 'Équipe Bleue' : 'Équipe Rouge';
        
        let message, style;
        if (isLocalWinner) {
            message = `🏆 VICTOIRE !\n${winnerName} gagne ${finalScore.blue}-${finalScore.red}`;
            style = 'color: gold; font-size: 36px;';
        } else {
            message = `😢 Défaite...\n${winnerName} gagne ${finalScore.blue}-${finalScore.red}`;
            style = 'color: #ff6b6b; font-size: 28px;';
        }
        
        this.elements.gameMessage.innerHTML = message.replace('\n', '<br>');
        this.elements.gameMessage.style.cssText += style;
        this.elements.gameMessage.style.display = 'block';
        
        // Nouvelle partie dans 5 secondes
        setTimeout(() => {
            this.showGameMessage('🔄 Nouvelle partie dans 3...', 1000);
            setTimeout(() => {
                this.showGameMessage('🔄 Nouvelle partie dans 2...', 1000);
                setTimeout(() => {
                    this.showGameMessage('🔄 Nouvelle partie dans 1...', 1000);
                    setTimeout(() => {
                        this.elements.gameMessage.style.display = 'none';
                    }, 1000);
                }, 1000);
            }, 1000);
        }, 2000);
    }

    // Informations de debug
    showDebugInfo() {
        const stats = networkManager.getConnectionStats();
        const ballPos = physicsManager.getBallPosition();
        const fps = this.getFPS();
        
        const debugInfo = `
            🐛 INFORMATIONS DEBUG
            
            🌐 Réseau:
            • Connecté: ${stats.connected ? 'Oui' : 'Non'}
            • ID Joueur: ${stats.playerId || 'N/A'}
            • Équipe: ${stats.playerTeam || 'N/A'}
            • Ping: ${stats.ping || 'N/A'} ms
            
            ⚽ Jeu:
            • Position ballon: ${ballPos ? `${ballPos.x.toFixed(1)}, ${ballPos.y.toFixed(1)}, ${ballPos.z.toFixed(1)}` : 'N/A'}
            • Joueurs connectés: ${game.players.size}
            • FPS: ${fps}
            
            🎮 Performance:
            • WebGL: ${game.renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1'}
            • Triangles: ${game.renderer.info.render.triangles}
            • Appels de rendu: ${game.renderer.info.render.calls}
        `;
        
        alert(debugInfo);
    }

    getFPS() {
        // Simple compteur FPS
        if (!this.fpsCounter) {
            this.fpsCounter = { frames: 0, lastTime: Date.now(), fps: 0 };
        }
        
        this.fpsCounter.frames++;
        const now = Date.now();
        
        if (now - this.fpsCounter.lastTime >= 1000) {
            this.fpsCounter.fps = this.fpsCounter.frames;
            this.fpsCounter.frames = 0;
            this.fpsCounter.lastTime = now;
        }
        
        return this.fpsCounter.fps;
    }

    // Adaptation responsive
    updateLayout() {
        const width = window.innerWidth;
        const height = window.innerHeight;
    }

    // Notifications push (si supportées)
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    showNotification(title, message, icon = '⚽') {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: 'data:text/plain;base64,' + btoa(icon)
            });
        }
    }

    // Effets visuels supplémentaires
    createFloatingText(text, position, color = '#ffffff', duration = 2000) {
        const element = document.createElement('div');
        element.textContent = text;
        element.style.cssText = `
            position: fixed;
            color: ${color};
            font-weight: bold;
            font-size: 20px;
            pointer-events: none;
            z-index: 1000;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        `;
        
        // Convertir la position 3D en position 2D écran
        const vector = new THREE.Vector3(position.x, position.y + 2, position.z);
        vector.project(game.camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        
        document.body.appendChild(element);
        
        // Animation
        let opacity = 1;
        let yOffset = 0;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                document.body.removeChild(element);
                return;
            }
            
            opacity = 1 - progress;
            yOffset = progress * 50;
            
            element.style.opacity = opacity;
            element.style.transform = `translateY(-${yOffset}px)`;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    // Méthode pour afficher des messages de jeu temporaires
    showGameMessage(message, duration = 3000) {
        // Utiliser la méthode existante showTemporaryMessage si disponible
        if (typeof this.showTemporaryMessage === 'function') {
            this.showTemporaryMessage(message, duration);
            return;
        }
        
        // Sinon, créer un affichage simple
        console.log(`🎮 ${message}`);
        
        // Créer un élément de message temporaire
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            z-index: 10000;
            text-align: center;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        
        // Supprimer après le délai
        setTimeout(() => {
            if (document.body.contains(messageElement)) {
                document.body.removeChild(messageElement);
            }
        }, duration);
    }
}

// Instance globale du gestionnaire UI
const uiManager = new UIManager();

// Fonction globale pour rejoindre le jeu (appelée depuis HTML)
function joinGame() {
    uiManager.joinGame();
}