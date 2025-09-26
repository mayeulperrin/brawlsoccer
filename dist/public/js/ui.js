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
        if (this.elements.playerName) {
            this.elements.playerName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.joinGame();
                }
            });
            this.elements.playerName.focus();
        }
        const joinBtn = document.getElementById('joinGameBtn');
        if (joinBtn) {
            joinBtn.onclick = () => this.joinGame();
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                this.showDebugInfo();
            }
        });
        window.addEventListener('resize', () => {
            this.updateLayout();
        });
    }
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
        if (!/^[a-zA-Z0-9_-]+$/.test(playerName)) {
            this.showConnectionStatus('Pseudo invalide (lettres, chiffres, _ et - seulement)', 'warning');
            return;
        }
        networkManager.joinGame(playerName);
        this.showConnectionStatus('Connexion en cours...', 'info');
    }
    clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }
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
        if (duration > 0) {
            setTimeout(() => {
                this.connectionStatus.style.display = 'none';
            }, duration);
        }
    }
    hideConnectionStatus() {
        this.connectionStatus.style.display = 'none';
    }
    updateScore(score) {
        this.elements.blueScore.textContent = score.blue;
        this.elements.redScore.textContent = score.red;
    }
    updatePlayersList(players) {
        const now = Date.now();
        if (this.lastPlayersUpdate && (now - this.lastPlayersUpdate) < 15) {
            return;
        }
        const currentHash = this.generatePlayersHash(players);
        if (this.lastPlayersHash === currentHash) {
            return; 
        }
        this.lastPlayersHash = currentHash;
        this.lastPlayersUpdate = now;
        this.elements.playersContent.innerHTML = '';
        const teams = {
            blue: players.filter(p => p.team === 'blue'),
            red: players.filter(p => p.team === 'red')
        };
        if (teams.blue.length > 0) {
            const blueTitle = document.createElement('h4');
            blueTitle.textContent = '🔵 Équipe Bleue';
            blueTitle.className = 'team-blue';
            this.elements.playersContent.appendChild(blueTitle);
            teams.blue.forEach(player => {
                this.addPlayerToList(player);
            });
        }
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
        const totalPlayers = players.length;
        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = 'margin-top: 10px; font-size: 12px; color: rgba(255, 255, 255, 0.8);';
        statusDiv.textContent = `${totalPlayers}/8 joueurs connectés`;
        this.elements.playersContent.appendChild(statusDiv);
    }
    generatePlayersHash(players) {
        let hash = 0;
        const sortedPlayers = players.slice().sort((a, b) => a.id.localeCompare(b.id));
        for (let player of sortedPlayers) {
            const healthBracket = Math.floor(player.health / 10) * 10; 
            const playerString = `${player.id}_${player.name}_${player.team}_${healthBracket}_${player.isKnockedOut ? 1 : 0}_${player.giveKOCount || 0}_${player.receiveKOCount || 0}`;
            for (let i = 0; i < playerString.length; i++) {
                const char = playerString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; 
            }
        }
        hash += players.length * 1000;
        return hash;
    }
    addPlayerToList(player) {
        const playerDiv = document.createElement('div');
        playerDiv.style.cssText = 'margin: 5px 0; padding: 5px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; font-size: 14px;';
        let statusIcon = '🟢';
        if (player.isKnockedOut) statusIcon = '💀';
        else if (player.health < 50) statusIcon = '🟡';
        else if (player.health < 25) statusIcon = '🔴';
        const isLocal = player.id === networkManager.playerId;
        const nameStyle = isLocal ? 'font-weight: bold; text-decoration: underline;' : '';
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
    updateLayout() {
        const width = window.innerWidth;
        const height = window.innerHeight;
    }
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
        const vector = new THREE.Vector3(position.x, position.y + 2, position.z);
        vector.project(game.camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        document.body.appendChild(element);
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
    showGameMessage(message, duration = 3000) {
        if (typeof this.showTemporaryMessage === 'function') {
            this.showTemporaryMessage(message, duration);
            return;
        }
        console.log(`🎮 ${message}`);
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
        setTimeout(() => {
            if (document.body.contains(messageElement)) {
                document.body.removeChild(messageElement);
            }
        }, duration);
    }
}
const uiManager = new UIManager();
function joinGame() {
    uiManager.joinGame();
}