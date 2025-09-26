// mobile-controls.js - Contrôles tactiles pour mobile
class MobileControls {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isActive = false;
        this.mobileControlsContainer = null;
        this.isVisible = false;
        
        // État des contrôles
        this.movement = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };
        
        this.actions = {
            shoot: false,
        };
        
        // Joystick virtuel
        this.joystick = {
            container: null,
            stick: null,
            isDragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            maxDistance: 40
        };
        
        // Boutons d'action
        this.actionButtons = new Map();
        
        console.log('📱 MobileControls créé, mobile détecté:', this.isMobile);
        
        if (this.isMobile) {
            // Initialiser immédiatement
            this.init();
        }
    }

    detectMobile() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isSmallScreen = window.innerWidth <= 768;
        
        return isMobileUA || isTouchDevice || isSmallScreen;
    }

    init() {
        console.log('📱 Initialisation des contrôles mobiles');
        
        // Attendre que le DOM soit prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createMobileUI();
                this.setupIntegration();
            });
        } else {
            this.createMobileUI();
            this.setupIntegration();
        }
        
        this.preventDefaultBehaviors();
        this.adjustLoginScreenForMobile();
        
        this.isActive = true;
        console.log('✅ Contrôles mobiles activés');
    }

    setupIntegration() {
        // Intégrer avec le système de jeu existant
        const originalJoinGame = window.joinGame;
        
        window.joinGame = () => {
            console.log('📱 JoinGame appelé, affichage des contrôles mobiles');
            
            if (originalJoinGame && typeof originalJoinGame === 'function') {
                originalJoinGame();
            }
            
            // Afficher les contrôles mobiles immédiatement
            setTimeout(() => {
                this.showControls();
            }, 100);
        };
        
        // Surveiller l'état du jeu pour afficher/masquer les contrôles
        this.monitorGameState();
    }

    monitorGameState() {
        // Vérifier périodiquement si le jeu est démarré
        setInterval(() => {
            const loginScreen = document.getElementById('loginScreen');
            const scoreBoard = document.getElementById('scoreBoard');
            
            if (loginScreen && loginScreen.style.display === 'none' && !this.isVisible) {
                console.log('📱 Jeu détecté comme démarré, affichage des contrôles');
                this.showControls();
            } else if (loginScreen && loginScreen.style.display !== 'none' && this.isVisible) {
                console.log('📱 Retour au menu, masquage des contrôles');
                this.hideControls();
            }
        }, 1000);
    }

    createMobileUI() {
        // Supprimer les anciens contrôles s'ils existent
        const existingControls = document.getElementById('mobile-controls-overlay');
        if (existingControls) {
            existingControls.remove();
        }

        // Container principal des contrôles
        this.mobileControlsContainer = document.createElement('div');
        this.mobileControlsContainer.id = 'mobile-controls-overlay';
        this.mobileControlsContainer.style.cssText = `
            position: fixed !important;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 999 !important;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            display: none;
        `;
        
        // Créer le joystick
        this.createJoystick();
        
        // Créer les boutons d'action
        this.createActionButtons();
        
        document.body.appendChild(this.mobileControlsContainer);
        
        console.log('📱 Interface mobile créée');
    }

    createJoystick() {
        // Container du joystick
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'mobile-joystick';
        joystickContainer.style.cssText = `
            position: absolute !important;
            bottom: 40px !important;
            left: 40px !important;
            width: 120px !important;
            height: 120px !important;
            border-radius: 50% !important;
            background: rgba(0, 255, 100, 0.2) !important;
            border: 3px solid rgba(0, 255, 100, 0.8) !important;
            pointer-events: auto !important;
            touch-action: none !important;
            backdrop-filter: blur(5px) !important;
            box-shadow: 0 0 30px rgba(0, 255, 100, 0.5) !important;
        `;
        
        // Stick du joystick
        const joystickStick = document.createElement('div');
        joystickStick.id = 'mobile-joystick-stick';
        joystickStick.style.cssText = `
            position: absolute !important;
            bottom: 50% !important;
            left: 50% !important;
            width: 40px !important;
            height: 40px !important;
            border-radius: 50% !important;
            background: rgba(0, 255, 100, 1) !important;
            transform: translate(-50%, -50%) !important;
            transition: none !important;
            box-shadow: 0 0 20px rgba(0, 255, 100, 1) !important;
            border: 3px solid rgba(255, 255, 255, 1) !important;
        `;
        
        joystickContainer.appendChild(joystickStick);
        this.mobileControlsContainer.appendChild(joystickContainer);
        
        this.joystick.container = joystickContainer;
        this.joystick.stick = joystickStick;
        
        // Events du joystick
        this.setupJoystickEvents();
    }

    createActionButtons() {
        // Bouton de frappe/tir
        const shootButton = document.createElement('div');
        shootButton.id = 'mobile-shoot-btn';
        shootButton.innerHTML = '🥊';
        shootButton.style.cssText = `
            position: absolute !important;
            bottom: 40px !important;
            right: 40px !important;
            width: 80px !important;
            height: 80px !important;
            border-radius: 50% !important;
            background: linear-gradient(45deg, #ff4444, #ff6666) !important;
            border: 3px solid rgba(255, 68, 68, 1) !important;
            color: white !important;
            font-size: 30px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: auto !important;
            touch-action: manipulation !important;
            box-shadow: 0 0 30px rgba(255, 68, 68, 0.8) !important;
            user-select: none !important;
            -webkit-tap-highlight-color: transparent !important;
            backdrop-filter: blur(5px) !important;
        `;
        this.mobileControlsContainer.appendChild(shootButton);
        
        this.actionButtons.set('shoot', shootButton);
        
        // Events des boutons
        this.setupButtonEvents();
    }

    setupJoystickEvents() {
        const container = this.joystick.container;
        
        // Touch start
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            
            this.joystick.isDragging = true;
            this.joystick.startX = rect.left + rect.width / 2;
            this.joystick.startY = rect.top + rect.height / 2;
            this.joystick.currentX = touch.clientX;
            this.joystick.currentY = touch.clientY;
            
            container.style.transform = 'scale(1.1)';
            container.style.background = 'rgba(0, 255, 100, 0.4)';
            this.updateJoystick();
            
            console.log('📱 Joystick touché');
        }, { passive: false });
        
        // Touch move global pour suivre partout
        document.addEventListener('touchmove', (e) => {
            if (!this.joystick.isDragging) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            this.joystick.currentX = touch.clientX;
            this.joystick.currentY = touch.clientY;
            
            this.updateJoystick();
        }, { passive: false });
        
        // Touch end global
        document.addEventListener('touchend', (e) => {
            if (!this.joystick.isDragging) return;
            e.preventDefault();
            
            this.joystick.isDragging = false;
            container.style.transform = 'scale(1)';
            container.style.background = 'rgba(0, 255, 100, 0.2)';
            this.resetJoystick();
            
            console.log('📱 Joystick relâché');
        }, { passive: false });
    }

    updateJoystick() {
        const deltaX = this.joystick.currentX - this.joystick.startX;
        const deltaY = this.joystick.currentY - this.joystick.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        let finalX = deltaX;
        let finalY = deltaY;
        
        // Limiter la distance
        if (distance > this.joystick.maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            finalX = Math.cos(angle) * this.joystick.maxDistance;
            finalY = Math.sin(angle) * this.joystick.maxDistance;
        }
        
        // Mettre à jour la position visuelle
        this.joystick.stick.style.transform = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px))`;
        
        // Convertir en mouvement de jeu
        this.updateMovementFromJoystick(finalX, finalY);
    }

    updateMovementFromJoystick(x, y) {
        const threshold = 10;
        
        // Reset mouvement
        const oldMovement = { ...this.movement };
        this.movement.forward = false;
        this.movement.backward = false;
        this.movement.left = false;
        this.movement.right = false;
        
        // Déterminer la direction
        if (Math.abs(y) > threshold) {
            if (y < 0) this.movement.forward = true;
            if (y > 0) this.movement.backward = true;
        }
        
        if (Math.abs(x) > threshold) {
            if (x < 0) this.movement.left = true;
            if (x > 0) this.movement.right = true;
        }
        
        // Envoyer le mouvement au système de jeu
        this.sendMovementToGame();
    }

    resetJoystick() {
        // Remettre le stick au centre
        this.joystick.stick.style.transform = 'translate(-50%, -50%)';
        
        // Arrêter tout mouvement
        this.movement = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };
        
        console.log('📱 Mouvement arrêté');
        this.sendMovementToGame();
    }

    setupButtonEvents() {
        // Bouton de frappe
        const shootButton = this.actionButtons.get('shoot');
        if (shootButton) {
            shootButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                this.actions.shoot = true;
                shootButton.style.transform = 'scale(0.85)';
                shootButton.style.background = 'linear-gradient(45deg, #ff6666, #ff8888)';
                shootButton.style.boxShadow = '0 0 40px rgba(255, 68, 68, 1)';
                
                this.sendActionToGame('shoot', true);
                console.log('📱 Bouton tir appuyé');
            }, { passive: false });
            
            shootButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                this.actions.shoot = false;
                shootButton.style.transform = 'scale(1)';
                shootButton.style.background = 'linear-gradient(45deg, #ff4444, #ff6666)';
                shootButton.style.boxShadow = '0 0 30px rgba(255, 68, 68, 0.8)';
                
                this.sendActionToGame('shoot', false);
                console.log('📱 Bouton tir relâché');
            }, { passive: false });
        }
    }

    sendMovementToGame() {
        // Méthode 1: Intégration directe avec window.game si disponible
        if (window.game && window.game.keys) {
            window.game.keys.w = this.movement.forward;
            window.game.keys.s = this.movement.backward;
            window.game.keys.a = this.movement.left;
            window.game.keys.d = this.movement.right;
            // Aussi les touches alternatives
            window.game.keys['ArrowUp'] = this.movement.forward;
            window.game.keys['ArrowDown'] = this.movement.backward;
            window.game.keys['ArrowLeft'] = this.movement.left;
            window.game.keys['ArrowRight'] = this.movement.right;
            
            return;
        }
        
        // Méthode 2: Simuler des événements clavier
        this.simulateKeyboardEvents();
    }

    simulateKeyboardEvents() {
        // Simuler keydown/keyup pour les touches de mouvement
        const keyMap = {
            forward: 'KeyW',
            backward: 'KeyS', 
            left: 'KeyA',
            right: 'KeyD'
        };
        
        for (const [direction, pressed] of Object.entries(this.movement)) {
            const keyCode = keyMap[direction];
            if (keyCode) {
                const event = new KeyboardEvent(pressed ? 'keydown' : 'keyup', {
                    code: keyCode,
                    key: keyCode.replace('Key', '').toLowerCase(),
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(event);
            }
        }
    }

    sendActionToGame(action, pressed) {
        if (window.game && window.game.keys) {
            if (action === 'shoot') {
                window.game.keys[' '] = pressed; // Espace pour tirer
                window.game.keys['Space'] = pressed;
            }
            return;
        }
        
        // Simuler événement clavier pour les actions
        const keyMap = {
            shoot: 'Space',
        };
        
        const keyCode = keyMap[action];
        if (keyCode) {
            const event = new KeyboardEvent(pressed ? 'keydown' : 'keyup', {
                code: keyCode,
                key: keyCode === 'Space' ? ' ' : 'Shift',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        }
    }

    showControls() {
        if (this.mobileControlsContainer && !this.isVisible) {
            this.mobileControlsContainer.style.display = 'block';
            this.mobileControlsContainer.style.visibility = 'visible';
            this.isVisible = true;
            console.log('📱 Contrôles mobiles AFFICHÉS');
        }
    }

    hideControls() {
        if (this.mobileControlsContainer && this.isVisible) {
            this.mobileControlsContainer.style.display = 'none';
            this.isVisible = false;
            console.log('📱 Contrôles mobiles MASQUÉS');
        }
    }

    preventDefaultBehaviors() {
        // Empêcher le zoom par pincement
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Empêcher le double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
        
        // Styles anti-zoom
        const style = document.createElement('style');
        style.id = 'mobile-prevent-defaults';
        style.innerHTML = `
            body {
                -webkit-user-select: none !important;
                -webkit-touch-callout: none !important;
                -webkit-tap-highlight-color: transparent !important;
                user-select: none !important;
                touch-action: manipulation !important;
                overflow: hidden !important;
            }
            
            input {
                -webkit-user-select: text !important;
                user-select: text !important;
                touch-action: manipulation !important;
            }
            
            #mobile-controls-overlay * {
                -webkit-tap-highlight-color: transparent !important;
            }
        `;
        
        if (!document.getElementById('mobile-prevent-defaults')) {
            document.head.appendChild(style);
        }
    }

    adjustLoginScreenForMobile() {
        if (!this.isMobile) return;
        
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.style.cssText += `
                width: 90vw !important;
                max-width: 350px !important;
                padding: 20px !important;
                font-size: 14px !important;
            `;
            
            const inputs = loginScreen.querySelectorAll('input, button');
            inputs.forEach(input => {
                input.style.cssText += `
                    width: 100% !important;
                    font-size: 16px !important;
                    padding: 12px !important;
                    margin: 8px 0 !important;
                `;
            });
        }
    }

    // Méthodes publiques
    getMovement() {
        return this.movement;
    }

    getActions() {
        return this.actions;
    }

    isMoving() {
        return Object.values(this.movement).some(value => value);
    }

    destroy() {
        if (this.mobileControlsContainer) {
            this.mobileControlsContainer.remove();
            this.mobileControlsContainer = null;
        }
        this.isActive = false;
        console.log('🗑️ Contrôles mobiles détruits');
    }

    static isMobileDevice() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isSmallScreen = window.innerWidth <= 768;
        
        return isMobileUA || isTouchDevice || isSmallScreen;
    }
}

// Auto-initialisation
console.log('📱 Script mobile-controls.js chargé');

// Initialiser dès que le script est chargé
if (MobileControls.isMobileDevice() && !window.mobileControls) {
    console.log('📱 Auto-initialisation des contrôles mobiles');
    window.mobileControls = new MobileControls();
    
    // Test immédiat d'affichage pour debug
    setTimeout(() => {
        if (window.mobileControls) {
            window.mobileControls.showControls();
            console.log('📱 Test d\'affichage des contrôles');
        }
    }, 2000);
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileControls;
}
