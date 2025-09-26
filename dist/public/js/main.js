class SoccerBoxApp {
    constructor() {
        this.initialized = false;
        this.gameLoop = null;
        this.lastTime = 0;
        this.targetFPS = 60;
        this.init();
    }
    async init() {
        console.log('🚀 Initialisation de SoccerBox...');
        if (!this.checkWebGLSupport()) {
            this.showError('WebGL n\'est pas supporté par votre navigateur');
            return;
        }
        if (!window.WebSocket && !window.MozWebSocket) {
            this.showError('WebSocket n\'est pas supporté par votre navigateur');
            return;
        }
        try {
            this.checkLibrariesSupport();
            await this.waitForModules();
            this.setupGlobalEventListeners();
            this.setupPerformanceMonitoring();
            uiManager.requestNotificationPermission();
            this.startGameLoop();
            this.initialized = true;
            console.log('✅ SoccerBox initialisé avec succès !');
            this.showWelcomeMessage();
        } catch (error) {
            console.error('❌ Erreur d\'initialisation:', error);
            this.showError(`Erreur d'initialisation: ${error.message}`);
        }
    }
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    checkLibrariesSupport() {
        const missing = [];
        if (typeof THREE === 'undefined') missing.push('Three.js');
        if (typeof CANNON === 'undefined') missing.push('Cannon.js'); 
        if (typeof io === 'undefined') missing.push('Socket.IO');
        if (missing.length > 0) {
            throw new Error(`Librairies manquantes: ${missing.join(', ')}`);
        }
        console.log('✅ Toutes les librairies sont chargées correctement');
        return true;
    }
    async waitForModules() {
        const maxWait = 20000; 
        const startTime = Date.now();
        console.log('⏳ Attente du chargement des modules...');
        while (Date.now() - startTime < maxWait) {
            const elapsed = Date.now() - startTime;
            if (typeof THREE === 'undefined') {
                console.log(`⏳ Attente de Three.js... (${Math.round(elapsed/1000)}s)`);
                await new Promise(resolve => setTimeout(resolve, 200));
                continue;
            }
            if (typeof CANNON === 'undefined') {
                console.log(`⏳ Attente de Cannon.js... (${Math.round(elapsed/1000)}s)`);
                await new Promise(resolve => setTimeout(resolve, 200));
                continue;
            }
            if (typeof io === 'undefined') {
                console.log(`⏳ Attente de Socket.IO... (${Math.round(elapsed/1000)}s)`);
                await new Promise(resolve => setTimeout(resolve, 200));
                continue;
            }
            console.log('✅ Librairies chargées ! Initialisation des modules...');
            await new Promise(resolve => setTimeout(resolve, 500));
            return;
        }
        const librariesStatus = {
            THREE: typeof THREE !== 'undefined',
            CANNON: typeof CANNON !== 'undefined', 
            io: typeof io !== 'undefined'
        };
        console.error('❌ Timeout des librairies CDN:', librariesStatus);
        if (typeof CANNON === 'undefined') {
            console.warn('⚠️ Cannon.js non chargé, utilisation du fallback...');
        }
        throw new Error(`Timeout: librairies CDN non chargées après ${maxWait/1000}s`);
    }
    setupGlobalEventListeners() {
        window.addEventListener('error', (e) => {
            console.error('Erreur JavaScript:', e.error);
            this.handleError(e.error);
        });
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Promesse rejetée:', e.reason);
            this.handleError(e.reason);
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseGame();
            } else {
                this.resumeGame();
            }
        });
        window.addEventListener('beforeunload', (e) => {
            if (networkManager.connected) {
                networkManager.disconnect();
            }
        });
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'F11':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'F12':
                    break;
                case 'KeyM':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.toggleMute();
                    }
                    break;
            }
        });
    }
    setupPerformanceMonitoring() {
        this.performanceStats = {
            frameCount: 0,
            lastFPSUpdate: Date.now(),
            currentFPS: 0,
            minFPS: Infinity,
            maxFPS: 0,
            averageFPS: 0,
            frameTimings: []
        };
        setInterval(() => {
            if (this.performanceStats.currentFPS < 30 && this.performanceStats.frameCount > 100) {
                console.warn('⚠️ Performances faibles détectées (FPS < 30)');
            }
        }, 5000);
    }
    startGameLoop() {
        const animate = (currentTime) => {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            const clampedDeltaTime = Math.min(deltaTime, 1/30); 
            this.update(clampedDeltaTime);
            this.gameLoop = requestAnimationFrame(animate);
        };
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame(animate);
    }
    update(deltaTime) {
        if (!this.initialized) return;
        this.updatePerformanceStats();
        if (physicsManager && typeof physicsManager.update === 'function') {
            physicsManager.update(deltaTime);
        }
        if (game && typeof game.update === 'function') {
            game.update(deltaTime);
        }
        if (game && game.renderer && game.scene && game.camera) {
            game.renderer.render(game.scene, game.camera);
        }
    }
    updatePerformanceStats() {
        const now = Date.now();
        this.performanceStats.frameCount++;
        if (now - this.performanceStats.lastFPSUpdate >= 1000) {
            this.performanceStats.currentFPS = this.performanceStats.frameCount;
            if (this.performanceStats.currentFPS < this.performanceStats.minFPS) {
                this.performanceStats.minFPS = this.performanceStats.currentFPS;
            }
            if (this.performanceStats.currentFPS > this.performanceStats.maxFPS) {
                this.performanceStats.maxFPS = this.performanceStats.currentFPS;
            }
            this.performanceStats.frameTimings.push(this.performanceStats.currentFPS);
            if (this.performanceStats.frameTimings.length > 60) {
                this.performanceStats.frameTimings.shift();
            }
            const sum = this.performanceStats.frameTimings.reduce((a, b) => a + b, 0);
            this.performanceStats.averageFPS = Math.round(sum / this.performanceStats.frameTimings.length);
            this.performanceStats.frameCount = 0;
            this.performanceStats.lastFPSUpdate = now;
        }
    }
    pauseGame() {
        console.log('⏸️ Jeu en pause (page non visible)');
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
    }
    resumeGame() {
        console.log('▶️ Reprise du jeu');
        if (!this.gameLoop && this.initialized) {
            this.lastTime = performance.now();
            this.startGameLoop();
        }
    }
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Impossible d\'activer le plein écran:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    toggleMute() {
        console.log('🔇 Toggle mute (à implémenter)');
    }
    handleError(error) {
        console.error('Erreur de jeu:', error);
        if (error.name === 'WebGLContextLostEvent') {
            this.handleWebGLContextLoss();
        }
    }
    handleWebGLContextLoss() {
        console.warn('⚠️ Contexte WebGL perdu, tentative de récupération...');
        if (game && game.renderer) {
            game.renderer.forceContextRestore();
        }
        uiManager.showConnectionStatus('Récupération après perte de contexte WebGL', 'warning');
    }
    showError(message) {
        console.error('❌', message);
        const errorScreen = document.createElement('div');
        errorScreen.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                flex-direction: column;
                font-family: Arial, sans-serif;
                z-index: 10000;
            ">
                <h1 style="color: #ff6b6b; margin-bottom: 20px;">❌ Erreur</h1>
                <p style="font-size: 18px; text-align: center; max-width: 500px; line-height: 1.5;">
                    ${message}
                </p>
                <button onclick="window.location.reload()" style="
                    margin-top: 30px;
                    padding: 15px 30px;
                    background: #4ecdc4;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                ">
                    🔄 Recharger la page
                </button>
            </div>
        `;
        document.body.appendChild(errorScreen);
    }
    showWelcomeMessage() {
        console.log(`
        🎮 ========================================= 🎮
        ⚽         BIENVENUE DANS SOCCERBOX         ⚽
        🥊              FOOTBALL + BOXE             🥊
        ===============================================
        🎯 Objectif: Marquer des buts avec vos PIEDS
        👊 Défense: Frappez vos adversaires !
        🎮 Contrôles: ZQSD + Espace ou Clic
        🔥 Que le meilleur gagne ! 🔥
        `);
    }
    getGameState() {
        return {
            initialized: this.initialized,
            connected: networkManager ? networkManager.connected : false,
            playerId: networkManager ? networkManager.playerId : null,
            playersCount: game ? game.players.size : 0,
            performance: this.performanceStats
        };
    }
    debugCommands = {
        teleport: (x, z) => {
            if (physicsManager && networkManager.playerId) {
                physicsManager.teleportPlayer(networkManager.playerId, { x, y: 1, z });
                console.log(`Téléporté à (${x}, ${z})`);
            }
        },
        perf: () => {
            const stats = this.performanceStats;
            console.log(`
            📊 STATISTIQUES DE PERFORMANCE:
            • FPS actuel: ${stats.currentFPS}
            • FPS moyen: ${stats.averageFPS}
            • FPS min/max: ${stats.minFPS}/${stats.maxFPS}
            • Frames rendues: ${stats.frameTimings.length ? stats.frameTimings.reduce((a,b) => a+b, 0) : 0}
            `);
        },
        network: () => {
            const stats = networkManager.getConnectionStats();
            console.log('🌐 État réseau:', stats);
        },
        restart: () => {
            window.location.reload();
        }
    };
}
window.addEventListener('load', () => {
    window.soccerBoxApp = new SoccerBoxApp();
});
window.debug = {
    get app() { return window.soccerBoxApp; },
    get game() { return window.game; },
    get physics() { return window.physicsManager; },
    get network() { return window.networkManager; },
    get ui() { return window.uiManager; },
    teleport: (x, z) => window.soccerBoxApp?.debugCommands.teleport(x, z),
    perf: () => window.soccerBoxApp?.debugCommands.perf(),
    network: () => window.soccerBoxApp?.debugCommands.network(),
    restart: () => window.soccerBoxApp?.debugCommands.restart(),
    help: () => {
        console.log(`
        🛠️ COMMANDES DE DEBUG DISPONIBLES:
        debug.teleport(x, z)  - Téléporter le joueur
        debug.perf()          - Statistiques de performance
        debug.network()       - État de la connexion
        debug.restart()       - Redémarrer le jeu
        debug.app.getGameState() - État complet du jeu
        Exemple: debug.teleport(10, 5)
        `);
    }
};
console.log(`
🎮 SoccerBox - Jeu de Football-Boxe Multijoueur
Tapez "debug.help()" pour les commandes de développement
`);