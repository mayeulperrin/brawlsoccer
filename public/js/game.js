// game.js - Moteur principal du jeu avec Three.js
class SoccerBoxGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null; // Monde physique Cannon.js
        
        this.players = new Map();
        this.ball = null;
        this.terrain = null;
        this.goals = [];
        
        this.gameState = {
            players: [],
            ball: null,
            score: { blue: 0, red: 0 },
            gameStarted: false
        };
        
        this.localPlayerId = null;
        this.keys = {};
        this.mouseState = { clicked: false };
        
        this.init();
    }

    init() {
        // Vérifier que Three.js est disponible
        if (typeof THREE === 'undefined') {
            console.error('❌ Three.js n\'est pas chargé !');
            throw new Error('Three.js is required but not loaded');
        }

        this.createScene();
        this.createLights();
        this.createTerrain();
        this.createGoals();
        this.createBall();
        this.setupEventListeners();
        this.animate();
        
        console.log('🎮 SoccerBox Game initialisé !');
    }

    createScene() {
        // Scène
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Bleu ciel
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

        // Caméra
        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect
            0.1, // Near
            1000 // Far
        );
        this.camera.position.set(0, 25, 30);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Redimensionnement
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    createLights() {
        // Lumière ambiante (éclaircit les ombres des joueurs)
        const ambientLight = new THREE.AmbientLight(0x606060, 0.8); // Plus claire et plus intense
        this.scene.add(ambientLight);

        // Lumière directionnelle (soleil) - optimisée pour le terrain agrandi
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Légèrement plus intense
        directionalLight.position.set(40, 60, 20); // Position optimisée
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 4096; // Meilleure qualité d'ombre
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 300;
        // Ajustement pour le terrain agrandi (80x50)
        directionalLight.shadow.camera.left = -60; 
        directionalLight.shadow.camera.right = 60;
        directionalLight.shadow.camera.top = 40;
        directionalLight.shadow.camera.bottom = -40;
        // Ombres plus douces
        directionalLight.shadow.radius = 8;
        directionalLight.shadow.blurSamples = 25;
        this.scene.add(directionalLight);

        // Pas de lampadaires - terrain épuré
    }



    createTerrain() {
        // Pelouse principale (terrain agrandi sans murs)
        const fieldGeometry = new THREE.PlaneGeometry(80, 50);
        const fieldMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2d8f2d,
            side: THREE.DoubleSide 
        });
        this.terrain = new THREE.Mesh(fieldGeometry, fieldMaterial);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);

        // Lignes du terrain
        this.createFieldLines();

        // PAS de bordures - terrain ouvert pour plus de liberté
    }

    createFieldLines() {
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const lineWidth = 0.2;
        const lineHeight = 0.01;

        // Ligne de centre (adaptée au terrain agrandi)
        const centerLineGeometry = new THREE.PlaneGeometry(80, lineWidth);
        const centerLine = new THREE.Mesh(centerLineGeometry, lineMaterial);
        centerLine.rotation.x = -Math.PI / 2;
        centerLine.position.y = lineHeight;
        this.scene.add(centerLine);

        // Cercle central (agrandi aussi)
        const circleGeometry = new THREE.RingGeometry(6.9, 7.1, 32);
        const circle = new THREE.Mesh(circleGeometry, lineMaterial);
        circle.rotation.x = -Math.PI / 2;
        circle.position.y = lineHeight;
        this.scene.add(circle);

        // Lignes de but (plus éloignées)
        [-20, 20].forEach(z => {
            const goalLineGeometry = new THREE.PlaneGeometry(30, lineWidth);
            const goalLine = new THREE.Mesh(goalLineGeometry, lineMaterial);
            goalLine.rotation.x = -Math.PI / 2;
            goalLine.position.set(0, lineHeight, z);
            this.scene.add(goalLine);
        });

        // Surfaces de réparation (vraiment adaptées au terrain agrandi 80x50)
        [-20, 20].forEach(z => {
            const penaltyAreaGeometry = new THREE.EdgesGeometry(
                new THREE.BoxGeometry(30, 0, 12) // Plus large (30) et plus profonde (12)
            );
            const penaltyAreaMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
            const penaltyArea = new THREE.LineSegments(penaltyAreaGeometry, penaltyAreaMaterial);
            penaltyArea.position.set(0, lineHeight, z > 0 ? 19 : -19); // Plus près des buts
            this.scene.add(penaltyArea);
        });
    }

    createFieldBorders() {
        const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        // Bordures latérales
        const sideGeometry = new THREE.BoxGeometry(50, 2, 1);
        const topBorder = new THREE.Mesh(sideGeometry, borderMaterial);
        topBorder.position.set(0, 1, 15.5);
        topBorder.castShadow = true;
        this.scene.add(topBorder);

        const bottomBorder = new THREE.Mesh(sideGeometry, borderMaterial);
        bottomBorder.position.set(0, 1, -15.5);
        bottomBorder.castShadow = true;
        this.scene.add(bottomBorder);

        // Bordures des extrémités (mais pas devant les buts)
        const endGeometry = new THREE.BoxGeometry(1, 2, 30);
        const leftBorder = new THREE.Mesh(endGeometry, borderMaterial);
        leftBorder.position.set(-25.5, 1, 0);
        leftBorder.castShadow = true;
        this.scene.add(leftBorder);

        const rightBorder = new THREE.Mesh(endGeometry, borderMaterial);
        rightBorder.position.set(25.5, 1, 0);
        rightBorder.castShadow = true;
        this.scene.add(rightBorder);
    }

    createGoals() {
        const goalMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const netMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x888888, 
            wireframe: true,
            transparent: true,
            opacity: 0.7
        });

        // Positions des buts (adaptées au terrain agrandi)
        const goalPositions = [
            { z: -25, team: 'blue' },
            { z: 25, team: 'red' }
        ];

        goalPositions.forEach(goal => {
            const goalGroup = new THREE.Group();

            // Poteaux
            const postGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4);
            const leftPost = new THREE.Mesh(postGeometry, goalMaterial);
            leftPost.position.set(-3, 2, goal.z);
            leftPost.castShadow = true;
            goalGroup.add(leftPost);

            const rightPost = new THREE.Mesh(postGeometry, goalMaterial);
            rightPost.position.set(3, 2, goal.z);
            rightPost.castShadow = true;
            goalGroup.add(rightPost);

            // Barre transversale
            const crossbarGeometry = new THREE.CylinderGeometry(0.2, 0.2, 6);
            const crossbar = new THREE.Mesh(crossbarGeometry, goalMaterial);
            crossbar.rotation.z = Math.PI / 2;
            crossbar.position.set(0, 4, goal.z);
            crossbar.castShadow = true;
            goalGroup.add(crossbar);

            // Filet
            const netGeometry = new THREE.BoxGeometry(6, 4, 2);
            const net = new THREE.Mesh(netGeometry, netMaterial);
            net.position.set(0, 2, goal.z + (goal.z > 0 ? 1 : -1));
            goalGroup.add(net);

            this.goals.push({
                team: goal.team,
                position: goal.z,
                mesh: goalGroup
            });

            this.scene.add(goalGroup);
        });
    }

    createBall() {
        // Géométrie du ballon
        const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        
        // Matériau avec texture de ballon de football
        const ballMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            map: this.createSoccerBallTexture()
        });
        
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ball.position.set(0, 0.5, 0);
        this.ball.castShadow = true;
        this.scene.add(this.ball);
    }

    createSoccerBallTexture() {
        // Créer une texture simple de ballon
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Fond blanc
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 256, 256);

        // Motifs hexagonaux noirs
        ctx.fillStyle = '#000000';
        const hexagons = [
            { x: 128, y: 64, size: 20 },
            { x: 64, y: 128, size: 20 },
            { x: 192, y: 128, size: 20 },
            { x: 128, y: 192, size: 20 }
        ];

        hexagons.forEach(hex => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = hex.x + hex.size * Math.cos(angle);
                const y = hex.y + hex.size * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        });

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    createPlayer(playerData) {
        const playerGroup = new THREE.Group();

        // Corps du joueur
        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.8, 2);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: playerData.team === 'blue' ? 0x4169E1 : 0xFF4500 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        playerGroup.add(body);

        // Tête
        const headGeometry = new THREE.SphereGeometry(0.4);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB5 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.4;
        head.castShadow = true;
        playerGroup.add(head);

        // Gants de boxe
        const gloveGeometry = new THREE.SphereGeometry(0.3);
        const gloveMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
        
        const leftGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
        leftGlove.position.set(-0.8, 1.5, 0);
        leftGlove.castShadow = true;
        playerGroup.add(leftGlove);

        const rightGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
        rightGlove.position.set(0.8, 1.5, 0);
        rightGlove.castShadow = true;
        playerGroup.add(rightGlove);

        // Nom du joueur avec barre de vie
        const nameSprite = this.createNameSprite(playerData.name, playerData.team, playerData.health || 100);
        nameSprite.position.y = 3.5;
        playerGroup.add(nameSprite);

        // Trouver et stocker la référence à la barre de vie
        let healthBarRef = null;
        for (let i = 0; i < nameSprite.children.length; i++) {
            const child = nameSprite.children[i];
            if (child.userData && child.userData.canvas) {
                healthBarRef = child;
                break;
            }
        }

        // Stocker les références pour les animations
        playerGroup.userData = {
            body: body,
            head: head,
            leftGlove: leftGlove,
            rightGlove: rightGlove,
            playerId: playerData.id,
            team: playerData.team,
            punchAnimation: null,
            healthBar: healthBarRef // Référence directe à la barre de vie
        };

        playerGroup.position.copy(playerData.position);
        this.scene.add(playerGroup);
        this.players.set(playerData.id, playerGroup);

        return playerGroup;
    }

    createHealthBar(health = 100) {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 20;
        const ctx = canvas.getContext('2d');

        this.updateHealthBarCanvas(ctx, health);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 0.2, 1);
        
        // Stocker les données pour les mises à jour
        sprite.userData = { 
            canvas: canvas, 
            ctx: ctx, 
            texture: texture,
            health: health
        };

        return sprite;
    }

    updateHealthBarCanvas(ctx, health) {
        // Nettoyer le canvas
        ctx.clearRect(0, 0, 200, 20);
        
        // Fond de la barre (gris foncé)
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, 0, 200, 20);

        // Bordure noire
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 200, 20);

        // Barre de vie (couleur selon le pourcentage)
        const healthWidth = (health / 100) * 196; // 196 pour laisser 2px de bordure de chaque côté
        if (health > 60) {
            ctx.fillStyle = '#00FF00'; // Vert
        } else if (health > 30) {
            ctx.fillStyle = '#FFFF00'; // Jaune
        } else {
            ctx.fillStyle = '#FF0000'; // Rouge
        }
        ctx.fillRect(2, 2, healthWidth, 16);
    }

    createNameSprite(name, team, health = 100) {
        // Créer un groupe pour contenir le nom et la barre de vie
        const nameGroup = new THREE.Group();

        // Créer le sprite du nom
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // PAS DE FOND - canvas transparent
        ctx.clearRect(0, 0, 512, 128);

        // Texte avec contour pour la visibilité
        ctx.font = 'bold 67px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Contour noir épais pour la lisibilité
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(name, 256, 64);
        
        // Texte couleur de l'équipe
        ctx.fillStyle = team === 'blue' ? '#4169E1' : '#FF4500';
        ctx.fillText(name, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true // Important pour la transparence !
        });
        const nameSprite = new THREE.Sprite(spriteMaterial);
        nameSprite.scale.set(4, 1, 1);

        // Créer la barre de vie avec la santé actuelle
        const healthBar = this.createHealthBar(health);
        healthBar.position.set(0, 0.8, 0); // Au-dessus du nom

        // Ajouter les éléments au groupe
        nameGroup.add(nameSprite);
        nameGroup.add(healthBar);

        return nameGroup;
    }

    setupEventListeners() {
        // Événements clavier - NE PAS interférer avec les inputs
        document.addEventListener('keydown', (e) => {
            // Ne pas capturer si on est dans un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Ne pas capturer si l'écran de login est visible (vérifie la classe hidden)
            const loginScreen = document.getElementById('loginScreen');
            if (loginScreen && !loginScreen.classList.contains('hidden')) {
                return;
            }
            this.keys[e.code] = true;
            e.preventDefault();
        });

        document.addEventListener('keyup', (e) => {
            // Ne pas capturer si on est dans un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Ne pas capturer si l'écran de login est visible (vérifie la classe hidden)
            const loginScreen = document.getElementById('loginScreen');
            if (loginScreen && !loginScreen.classList.contains('hidden')) {
                return;
            }
            
            this.keys[e.code] = false;
            e.preventDefault();
        });

        // Événements souris
        document.addEventListener('mousedown', (e) => {
            this.mouseState.clicked = true;
            e.preventDefault();
        });

        document.addEventListener('mouseup', (e) => {
            this.mouseState.clicked = false;
            e.preventDefault();
        });

        // Empêcher le menu contextuel
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    updatePlayerControls() {
        if (!this.localPlayerId) return;

        // Contrôles de base
        const forwardPressed = this.keys['KeyW'] || this.keys['ArrowUp'];
        const backwardPressed = this.keys['KeyS'] || this.keys['ArrowDown'];
        const leftPressed = this.keys['KeyA'] || this.keys['ArrowLeft'];
        const rightPressed = this.keys['KeyD'] || this.keys['ArrowRight'];

        let movement;

        if (networkManager.playerTeam === 'blue') {
            // Équipe bleue : contrôles inversés pour correspondre à la vue inversée
            movement = {
                forward: backwardPressed,   // S/Bas devient avancer (vers but rouge)
                backward: forwardPressed,   // W/Haut devient reculer (vers but bleu)
                left: rightPressed,         // D/Droite devient gauche (perspective inversée)
                right: leftPressed          // A/Gauche devient droite (perspective inversée)
            };
        } else {
            // Équipe rouge : contrôles normaux
            movement = {
                forward: forwardPressed,
                backward: backwardPressed,
                left: leftPressed,
                right: rightPressed
            };
        }

        const punch = this.keys['Space'] || this.mouseState.clicked;

        // Envoyer les mouvements au serveur
        if (Object.values(movement).some(v => v)) {
            networkManager.sendPlayerMove(movement);
        }

        if (punch) {
            networkManager.sendPlayerPunch();
        }
    }

    updateGameState(newGameState) {
        this.gameState = newGameState;

        // Mettre à jour les joueurs
        newGameState.players.forEach(playerData => {
            let playerMesh = this.players.get(playerData.id);
            
            if (!playerMesh) {
                playerMesh = this.createPlayer(playerData);
            }

            // Mettre à jour la position
            playerMesh.position.copy(playerData.position);
            playerMesh.rotation.y = playerData.rotation || 0;

            // Mettre à jour la santé
            if (playerData.health !== undefined) {
                this.updatePlayerHealth(playerData.id, playerData.health);
            }

            // Effet de knockout
            if (playerData.isKnockedOut) {
                playerMesh.rotation.z = Math.PI / 2; // Tombé
            } else {
                playerMesh.rotation.z = 0;
            }
        });

        // Supprimer les joueurs déconnectés
        this.players.forEach((playerMesh, playerId) => {
            if (!newGameState.players.find(p => p.id === playerId)) {
                this.scene.remove(playerMesh);
                this.players.delete(playerId);
            }
        });

        // Mettre à jour le ballon
        if (newGameState.ball) {
            this.ball.position.copy(newGameState.ball.position);
            this.ball.rotation.x += 0.1;
            this.ball.rotation.z += 0.1;
        }
    }

    animatePunch(playerId) {
        const playerMesh = this.players.get(playerId);
        if (!playerMesh) return;

        const gloves = [playerMesh.userData.leftGlove, playerMesh.userData.rightGlove];
        
        gloves.forEach(glove => {
            const originalPosition = glove.position.clone();
            
            // Animation de coup de poing
            glove.position.z -= 0.5;
            
            setTimeout(() => {
                glove.position.copy(originalPosition);
            }, 200);
        });
    }

    updateCamera() {
        if (!this.localPlayerId) return;

        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;

        // Caméra adaptée à l'équipe du joueur
        const targetPosition = localPlayer.position.clone();
        targetPosition.y += 15;
        
        if (networkManager.playerTeam === 'blue') {
            // Équipe bleue : caméra derrière le joueur regardant vers le but rouge
            targetPosition.z -= 20; // Caméra côté but bleu
        } else {
            // Équipe rouge : caméra normale
            targetPosition.z += 20; // Caméra côté but rouge
        }

        this.camera.position.lerp(targetPosition, 0.05);
        this.camera.lookAt(localPlayer.position);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updatePlayerControls();
        this.updateCamera();
        
        this.renderer.render(this.scene, this.camera);
    }

    setLocalPlayerId(playerId) {
        this.localPlayerId = playerId;
    }

    showGameMessage(message, duration = 3000) {
        const messageElement = document.getElementById('gameMessage');
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, duration);
    }

    showKOMessage(message, duration = 2000) {
        const koElement = document.getElementById('koMessage');
        koElement.textContent = message;
        koElement.style.display = 'block';
        
        setTimeout(() => {
            koElement.style.display = 'none';
        }, duration);
    }

    getPlayerNameById(playerId) {
        if (!this.gameState || !this.gameState.players) {
            return playerId; // Retourner l'ID si pas de données
        }
        
        const player = this.gameState.players.find(p => p.id === playerId);
        return player ? player.name : playerId;
    }

    updatePlayerHealth(playerId, newHealth) {
        const playerGroup = this.players.get(playerId);
        if (!playerGroup) {
            console.log(`❌ Joueur ${playerId} introuvable pour mise à jour santé`);
            return;
        }

        // Utiliser la référence directe stockée dans userData
        const healthBar = playerGroup.userData.healthBar;
        
        if (healthBar && healthBar.userData && healthBar.userData.ctx) {
            // Mettre à jour le canvas de la barre de vie
            this.updateHealthBarCanvas(healthBar.userData.ctx, newHealth);
            
            // Marquer la texture comme nécessitant une mise à jour
            healthBar.userData.texture.needsUpdate = true;
            healthBar.userData.health = newHealth;
            
        }
    }
}

// Instance globale du jeu
const game = new SoccerBoxGame();