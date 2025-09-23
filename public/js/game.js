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
        this.mouseState = { clicked: false, rightClicked: false };
        
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
        
        // Couleurs d'équipe améliorées
        const teamColors = {
            blue: {
                primary: 0x1E88E5,      // Bleu moderne
                secondary: 0x0D47A1,    // Bleu foncé
                accent: 0x42A5F5        // Bleu clair
            },
            red: {
                primary: 0xE53935,      // Rouge moderne  
                secondary: 0xB71C1C,    // Rouge foncé
                accent: 0xEF5350        // Rouge clair
            }
        };
        
        const colors = teamColors[playerData.team];

        // === CORPS PRINCIPAL ===
        // Torse arrondi avec forme plus organique
        const torsoGeometry = new THREE.CylinderGeometry(0.6, 0.55, 1.4, 16);
        const torsoMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.primary,
            shininess: 30
        });
        const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
        torso.position.y = 1.4;
        torso.castShadow = true;
        playerGroup.add(torso);
        
        // Maillot arrondi suivant la forme du torse
        const jerseyGeometry = new THREE.CylinderGeometry(0.61, 0.56, 1.41, 16);
        const jerseyMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.secondary,
            transparent: true,
            opacity: 0.8
        });
        const jersey = new THREE.Mesh(jerseyGeometry, jerseyMaterial);
        jersey.position.y = 1.4;
        playerGroup.add(jersey);

        // Col pour transition douce torse/tête
        const collarGeometry = new THREE.CylinderGeometry(0.35, 0.32, 0.2, 16);
        const collarMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.secondary,
            shininess: 30
        });
        const collar = new THREE.Mesh(collarGeometry, collarMaterial);
        collar.position.y = 2.25;
        collar.castShadow = true;
        playerGroup.add(collar);

        // === TÊTE DÉTAILLÉE ===
        // Tête plus ovale et naturelle
        const headGeometry = new THREE.SphereGeometry(0.45, 20, 16);
        headGeometry.scale(1, 1.15, 0.9); // Légèrement ovale
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFDBB5,
            shininess: 10
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.6;
        head.castShadow = true;
        playerGroup.add(head);
        
        // Yeux
        const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 6);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 2.65, 0.35);
        playerGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 2.65, 0.35);
        playerGroup.add(rightEye);
        
        // Casque/bandeau d'équipe
        const helmetGeometry = new THREE.SphereGeometry(0.47, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.7);
        const helmetMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.accent,
            transparent: true,
            opacity: 0.7
        });
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.y = 2.6;
        playerGroup.add(helmet);

        // === BRAS ARTICULÉS ===
        // Épaules plus douces et arrondies
        const shoulderGeometry = new THREE.SphereGeometry(0.28, 16, 12);
        shoulderGeometry.scale(1.2, 0.8, 1); // Légèrement aplaties
        const shoulderMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.primary,
            shininess: 20
        });
        
        const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        leftShoulder.position.set(-0.65, 2.0, 0);
        leftShoulder.castShadow = true;
        playerGroup.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        rightShoulder.position.set(0.65, 2.0, 0);
        rightShoulder.castShadow = true;
        playerGroup.add(rightShoulder);
        
        // Bras plus arrondis avec segments
        const armGeometry = new THREE.CylinderGeometry(0.14, 0.16, 0.8, 12);
        const armMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFDBB5,
            shininess: 15
        });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
                leftArm.position.set(-0.65, 1.4, 0); // Aligné avec l'épaule gauche
        leftArm.castShadow = true;
        playerGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
                rightArm.position.set(0.65, 1.4, 0); // Aligné avec l'épaule droite
        rightArm.castShadow = true;
        playerGroup.add(rightArm);
        
        // Coudes pour des transitions plus douces
        const elbowGeometry = new THREE.SphereGeometry(0.16, 12, 8);
        const elbowMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFDBB5,
            shininess: 15
        });
        
        const leftElbow = new THREE.Mesh(elbowGeometry, elbowMaterial);
                leftElbow.position.set(-0.65, 1.0, 0); // Aligné avec le bras gauche
        leftElbow.castShadow = true;
        playerGroup.add(leftElbow);
        
        const rightElbow = new THREE.Mesh(elbowGeometry, elbowMaterial);
                rightElbow.position.set(0.65, 1.0, 0); // Aligné avec le bras droit

        rightElbow.castShadow = true;
        playerGroup.add(rightElbow);

        // === GANTS DE BOXE AMÉLIORÉS ===
        const gloveGeometry = new THREE.SphereGeometry(0.22, 12, 8);
                gloveGeometry.scale(1.1, 0.8, 1.2); // Forme plus réaliste

        const gloveMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xDC143C,
            shininess: 50
        });
        
        const leftGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
                leftGlove.position.set(-0.65, 0.9, 0.2); // Aligné avec le bras/coude gauche

        leftGlove.castShadow = true;
        playerGroup.add(leftGlove);

        const rightGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
                rightGlove.position.set(0.65, 0.9, 0.2); // Aligné avec le bras/coude droit

        rightGlove.castShadow = true;
        playerGroup.add(rightGlove);

        // === JAMBES ===
        // Jambes plus arrondies et naturelles
        const legGeometry = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 14);
        const legMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.primary,
            shininess: 20
        });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.22, 0.3, 0);
        leftLeg.castShadow = true;
        playerGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.22, 0.3, 0);
        rightLeg.castShadow = true;
        playerGroup.add(rightLeg);
        
        // Genoux pour des transitions plus douces
        const kneeGeometry = new THREE.SphereGeometry(0.20, 12, 8);
        const kneeMaterial = new THREE.MeshPhongMaterial({ 
            color: colors.primary,
            shininess: 25
        });
        
        const leftKnee = new THREE.Mesh(kneeGeometry, kneeMaterial);
        leftKnee.position.set(-0.22, -0.1, 0);
        leftKnee.castShadow = true;
        playerGroup.add(leftKnee);
        
        const rightKnee = new THREE.Mesh(kneeGeometry, kneeMaterial);
        rightKnee.position.set(0.22, -0.1, 0);
        rightKnee.castShadow = true;
        playerGroup.add(rightKnee);

        // === CHAUSSURES DE FOOT ===
        // Chaussures plus arrondies et réalistes
        const shoeGeometry = new THREE.CylinderGeometry(0.12, 0.18, 0.8, 10);
        shoeGeometry.rotateZ(Math.PI / 2); // Orientation horizontale
        const shoeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1a1a1a,
            shininess: 60
        });
        
        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.22, -0.28, 0.15);
        leftShoe.castShadow = true;
        playerGroup.add(leftShoe);
        
        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.22, -0.28, 0.15);
        rightShoe.castShadow = true;
        playerGroup.add(rightShoe);
        
        // Crampons
        const stutGeometry = new THREE.SphereGeometry(0.03, 6, 4);
        const stutMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
        
        for(let i = 0; i < 2; i++) {
            const xPos = i === 0 ? -0.25 : 0.25;
            for(let j = 0; j < 4; j++) {
                const stut = new THREE.Mesh(stutGeometry, stutMaterial);
                stut.position.set(xPos + (j-1.5) * 0.06, -0.32, 0.1 + (j % 2) * 0.2);
                playerGroup.add(stut);
            }
        }

        // === EFFETS VISUELS ===
        // Aura d'équipe subtile et fine
        const auraGeometry = new THREE.RingGeometry(1.2, 1.3, 32);
        const auraMaterial = new THREE.MeshBasicMaterial({ 
            color: colors.accent,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        });
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        aura.rotation.x = -Math.PI / 2;
        aura.position.y = 0.01;
        playerGroup.add(aura);
        
        // Numéro sur le maillot
        const playerNumber = Math.floor(Math.random() * 99) + 1;
        const numberSprite = this.createNumberSprite(playerNumber, colors.accent);
        numberSprite.position.set(0, 1.6, 0.31);
        numberSprite.scale.set(0.8, 0.8, 1);
        playerGroup.add(numberSprite);

        // Nom du joueur avec barre de vie améliorée
        const nameSprite = this.createNameSprite(playerData.name, playerData.team, playerData.health || 100);
        nameSprite.position.y = 4.0; // Plus haut à cause de la taille
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

        // === STOCKAGE DES RÉFÉRENCES POUR ANIMATIONS ===
        playerGroup.userData = {
            torso: torso,
            head: head,
            leftGlove: leftGlove,
            rightGlove: rightGlove,
            leftArm: leftArm,
            rightArm: rightArm,
            leftShoulder: leftShoulder,
            rightShoulder: rightShoulder,
            leftLeg: leftLeg,
            rightLeg: rightLeg,
            aura: aura,
            helmet: helmet,
            playerId: playerData.id,
            team: playerData.team,
            colors: colors,
            punchAnimation: null,
            walkAnimation: null,
            healthBar: healthBarRef,
            // Structure pour les animations
            animations: {
                torso: torso,
                head: head,
                leftArm: leftArm,
                rightArm: rightArm,
                leftLeg: leftLeg,
                rightLeg: rightLeg
            },
            originalPositions: {
                leftGlove: leftGlove.position.clone(),
                rightGlove: rightGlove.position.clone(),
                leftArm: leftArm.rotation.clone(),
                rightArm: rightArm.rotation.clone()
            }
        };

        // Ajouter une animation d'apparition
        this.playSpawnAnimation(playerGroup);

        playerGroup.position.copy(playerData.position);
        this.scene.add(playerGroup);
        this.players.set(playerData.id, playerGroup);

        return playerGroup;
    }

    // Créer une géométrie arrondie personnalisée
    createRoundedBox(width, height, depth, radius, segments = 8) {
        const shape = new THREE.Shape();
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        shape.moveTo(-halfWidth + radius, -halfHeight);
        shape.lineTo(halfWidth - radius, -halfHeight);
        shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
        shape.lineTo(halfWidth, halfHeight - radius);
        shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
        shape.lineTo(-halfWidth + radius, halfHeight);
        shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
        shape.lineTo(-halfWidth, -halfHeight + radius);
        shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);
        
        const extrudeSettings = {
            depth: depth,
            bevelEnabled: true,
            bevelSegments: segments,
            steps: 2,
            bevelSize: radius * 0.1,
            bevelThickness: radius * 0.1
        };
        
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }

    // Créer un sprite pour le numéro du joueur
    createNumberSprite(number, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Fond transparent
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(0, 0, 128, 128);

        // Bordure
        ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 128, 128);

        // Numéro
        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number.toString(), 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        return new THREE.Sprite(material);
    }

    // Animation d'apparition des joueurs
    playSpawnAnimation(playerGroup) {
        // Effet de téléportation
        const originalScale = playerGroup.scale.clone();
        playerGroup.scale.setScalar(0);
        
        // Animation de scale
        new TWEEN.Tween(playerGroup.scale)
            .to({ x: originalScale.x, y: originalScale.y, z: originalScale.z }, 500)
            .easing(TWEEN.Easing.Back.Out)
            .start();
            
        // Effet de rotation sur l'aura
        const aura = playerGroup.userData.aura;
        if (aura) {
            new TWEEN.Tween(aura.rotation)
                .to({ z: Math.PI * 2 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
        
        // Particules d'apparition
        this.createSpawnParticles(playerGroup.position, playerGroup.userData.colors.accent);
    }
    
    // Créer des particules d'apparition
    createSpawnParticles(position, color) {
        const particleCount = 20;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 6, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position aléatoire autour du joueur
            particle.position.set(
                position.x + (Math.random() - 0.5) * 2,
                position.y + Math.random() * 3,
                position.z + (Math.random() - 0.5) * 2
            );
            
            particles.add(particle);
            
            // Animation des particules vers le haut
            new TWEEN.Tween(particle.position)
                .to({ 
                    x: particle.position.x + (Math.random() - 0.5) * 4,
                    y: particle.position.y + 4,
                    z: particle.position.z + (Math.random() - 0.5) * 4
                }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
                
            // Fade out
            new TWEEN.Tween(particleMaterial)
                .to({ opacity: 0 }, 1000)
                .onComplete(() => {
                    particles.remove(particle);
                })
                .start();
        }
        
        this.scene.add(particles);
        
        // Supprimer le groupe après l'animation
        setTimeout(() => {
            this.scene.remove(particles);
        }, 1500);
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

    // Animations de mouvement pour les joueurs améliorés
    animatePlayerMovement(playerGroup, direction, isRunning = false) {
        if (!playerGroup.userData.animations) {
            console.warn("⚠️ Pas d'animations disponibles pour ce joueur");
            return;
        }
        
        const { torso, head, leftArm, rightArm, leftLeg, rightLeg } = playerGroup.userData.animations;
        const baseSpeed = isRunning ? 0.06 : 0.04; // Amplitudes plus visibles
        const time = Date.now() * 0.001;
        
        // Animation de course/marche - SEULEMENT jambes et torse
        if (direction.length() > 0.1) {
            // Calcul de la phase pour coordonner les jambes
            const walkCycle = time * (isRunning ? 10 : 6);
            
            // Mouvement des jambes (alternées) - Plus prononcé
            const leftLegPhase = Math.sin(walkCycle);
            const rightLegPhase = Math.sin(walkCycle + Math.PI);
            
            leftLeg.rotation.x = leftLegPhase * baseSpeed * 20;
            rightLeg.rotation.x = rightLegPhase * baseSpeed * 20;
            
            // BRAS IMMOBILES pendant la marche - position de garde de boxe
            leftArm.rotation.x = -0.3; // Position de garde fixe
            rightArm.rotation.x = -0.3; // Position de garde fixe
            leftArm.rotation.z = 0.2;   // Coudes écartés
            rightArm.rotation.z = -0.2; // Coudes écartés
            
            // Légère oscillation du torse seulement
            torso.rotation.z = Math.sin(walkCycle * 0.5) * baseSpeed * 2;
            torso.rotation.x = Math.sin(walkCycle) * baseSpeed * 1;
            
            // Mouvement de tête plus subtil
            head.rotation.y = Math.sin(walkCycle * 0.3) * baseSpeed * 3;
            head.rotation.x = Math.sin(walkCycle * 0.7) * baseSpeed * 1.5;
            
        } else {
            // Animation d'attente (idle) - Position de boxeur
            const idleTime = time * 2;
            
            // Respiration du torse
            torso.rotation.z = Math.sin(idleTime) * 0.015;
            torso.rotation.x = Math.sin(idleTime * 0.7) * 0.01;
            
            // Regard qui bouge
            head.rotation.y = Math.sin(idleTime * 0.3) * 0.03;
            head.rotation.x = Math.sin(idleTime * 0.5) * 0.015;
            
            // BRAS EN POSITION DE GARDE FIXE avec léger balancement
            const guardBase = -0.3; // Position de base des bras levés
            leftArm.rotation.x = guardBase + Math.sin(idleTime * 0.3) * 0.05; // Léger mouvement
            rightArm.rotation.x = guardBase + Math.sin(idleTime * 0.3 + Math.PI) * 0.05;
            leftArm.rotation.z = 0.2 + Math.sin(idleTime * 0.2) * 0.02;
            rightArm.rotation.z = -0.2 + Math.sin(idleTime * 0.2) * 0.02;
            
            // Jambes stables avec transfert de poids
            leftLeg.rotation.x = Math.sin(idleTime * 0.15) * 0.01;
            rightLeg.rotation.x = Math.sin(idleTime * 0.15 + Math.PI) * 0.01;
        }
    }
    
    // Animation de coup de poing - Plus puissante et visible
    animatePlayerPunch(playerGroup, isLeftPunch = true) {
        if (!playerGroup.userData.animations) return;
        
        const { leftArm, rightArm, torso, head } = playerGroup.userData.animations;
        const punchingArm = isLeftPunch ? leftArm : rightArm;
        const otherArm = isLeftPunch ? rightArm : leftArm;
        
        // Position de garde de base
        const guardPosition = -0.3;
        const guardZ = isLeftPunch ? 0.2 : -0.2;
        const otherGuardZ = isLeftPunch ? -0.2 : 0.2;
        
        // Bras qui frappe - Extension complète
        new TWEEN.Tween(punchingArm.rotation)
            .to({ x: 0.1, z: isLeftPunch ? -0.1 : 0.1 }, 120) // Extension vers l'avant
            .easing(TWEEN.Easing.Quadratic.Out)
            .chain(
                // Retour rapide à la garde
                new TWEEN.Tween(punchingArm.rotation)
                    .to({ x: guardPosition, z: guardZ }, 200)
                    .easing(TWEEN.Easing.Back.Out)
            )
            .start();
            
        // Autre bras reste en garde mais recule légèrement
        new TWEEN.Tween(otherArm.rotation)
            .to({ x: guardPosition - 0.1, z: otherGuardZ + (isLeftPunch ? -0.1 : 0.1) }, 120)
            .easing(TWEEN.Easing.Quadratic.Out)
            .chain(
                new TWEEN.Tween(otherArm.rotation)
                    .to({ x: guardPosition, z: otherGuardZ }, 200)
                    .easing(TWEEN.Easing.Back.Out)
            )
            .start();
            
        // Rotation du torse pour plus de puissance
        const originalTorsoRotation = torso.rotation.y;
        new TWEEN.Tween(torso.rotation)
            .to({ y: isLeftPunch ? -0.4 : 0.4 }, 120)
            .easing(TWEEN.Easing.Quadratic.Out)
            .chain(
                new TWEEN.Tween(torso.rotation)
                    .to({ y: originalTorsoRotation }, 250)
                    .easing(TWEEN.Easing.Back.Out)
            )
            .start();
            
        // Mouvement de tête pour accompagner
        const originalHeadRotation = head.rotation.y;
        new TWEEN.Tween(head.rotation)
            .to({ y: isLeftPunch ? -0.2 : 0.2 }, 120)
            .easing(TWEEN.Easing.Quadratic.Out)
            .chain(
                new TWEEN.Tween(head.rotation)
                    .to({ y: originalHeadRotation }, 250)
                    .easing(TWEEN.Easing.Back.Out)
            )
            .start();
    }
    
    // Animation de coup de pied avec mouvement des bras
    animatePlayerKick(playerGroup, isLeftKick = true) {
        if (!playerGroup.userData.animations) return;
        
        const { leftLeg, rightLeg, leftArm, rightArm, torso } = playerGroup.userData.animations;
        const leg = isLeftKick ? leftLeg : rightLeg;
        const oppositeArm = isLeftKick ? rightArm : leftArm; // Bras opposé pour l'équilibre
        const sameArm = isLeftKick ? leftArm : rightArm;
        
        const originalLegRotation = leg.rotation.x;
        const originalOppositeArmRotation = oppositeArm.rotation.x;
        const originalSameArmRotation = sameArm.rotation.x;
        const originalTorsoRotation = torso.rotation.y;
        
        // Animation de la jambe qui frappe
        new TWEEN.Tween(leg.rotation)
            .to({ x: Math.PI * 0.3 }, 200)
            .easing(TWEEN.Easing.Quadratic.Out)
            .chain(
                new TWEEN.Tween(leg.rotation)
                    .to({ x: -Math.PI * 0.2 }, 100)
                    .easing(TWEEN.Easing.Quadratic.In)
                    .chain(
                        new TWEEN.Tween(leg.rotation)
                            .to({ x: originalLegRotation }, 300)
                            .easing(TWEEN.Easing.Back.Out)
                    )
            )
            .start();
            
        // Bras opposé se lève pour l'équilibre (naturel lors d'un coup de pied)
        new TWEEN.Tween(oppositeArm.rotation)
            .to({ x: -Math.PI * 0.4, z: isLeftKick ? -0.3 : 0.3 }, 200)
            .easing(TWEEN.Easing.Quadratic.Out)
            .chain(
                new TWEEN.Tween(oppositeArm.rotation)
                    .to({ x: originalOppositeArmRotation, z: 0 }, 400)
                    .easing(TWEEN.Easing.Back.Out)
            )
            .start();
            
        // Bras du même côté recule légèrement
        new TWEEN.Tween(sameArm.rotation)
            .to({ x: Math.PI * 0.1, z: isLeftKick ? 0.2 : -0.2 }, 200)
            .easing(TWEEN.Easing.Quadratic.Out)
            .chain(
                new TWEEN.Tween(sameArm.rotation)
                    .to({ x: originalSameArmRotation, z: 0 }, 400)
                    .easing(TWEEN.Easing.Back.Out)
            )
            .start();
            
        // Rotation du torse pour plus de puissance
        new TWEEN.Tween(torso.rotation)
            .to({ y: isLeftKick ? 0.2 : -0.2 }, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .chain(
                new TWEEN.Tween(torso.rotation)
                    .to({ y: originalTorsoRotation }, 350)
                    .easing(TWEEN.Easing.Back.Out)
            )
            .start();
    }
    
    // Animation de célébration
    animatePlayerCelebration(playerGroup) {
        if (!playerGroup.userData.animations) return;
        
        const { torso, head, leftArm, rightArm } = playerGroup.userData.animations;
        
        // Les bras en l'air
        new TWEEN.Tween(leftArm.rotation)
            .to({ x: -Math.PI * 0.8, z: Math.PI * 0.3 }, 500)
            .easing(TWEEN.Easing.Back.Out)
            .start();
            
        new TWEEN.Tween(rightArm.rotation)
            .to({ x: -Math.PI * 0.8, z: -Math.PI * 0.3 }, 500)
            .easing(TWEEN.Easing.Back.Out)
            .start();
            
        // Saut de joie
        const originalY = playerGroup.position.y;
        new TWEEN.Tween(playerGroup.position)
            .to({ y: originalY + 1 }, 400)
            .easing(TWEEN.Easing.Quadratic.Out)
            .chain(
                new TWEEN.Tween(playerGroup.position)
                    .to({ y: originalY }, 400)
                    .easing(TWEEN.Easing.Bounce.Out)
            )
            .start();
            
        // Rotation de la tête
        new TWEEN.Tween(head.rotation)
            .to({ y: Math.PI * 0.1 }, 250)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .chain(
                new TWEEN.Tween(head.rotation)
                    .to({ y: -Math.PI * 0.1 }, 250)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .repeat(2)
                    .yoyo(true)
            )
            .start();
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
            if (e.button === 0) { // Clic gauche = coup de poing
                this.mouseState.clicked = true;
            } else if (e.button === 2) { // Clic droit = coup de pied
                this.mouseState.rightClicked = true;
            }
            e.preventDefault();
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouseState.clicked = false;
            } else if (e.button === 2) {
                this.mouseState.rightClicked = false;
            }
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
        const kick = this.keys['KeyF'] || this.mouseState.rightClicked;
        const testAnimation = this.keys['KeyT']; // Touche T pour test

        // Envoyer les mouvements au serveur
        if (Object.values(movement).some(v => v)) {
            networkManager.sendPlayerMove(movement);
        }

        if (punch) {
            networkManager.sendPlayerPunch();
            // Animation locale du coup de poing
            const localPlayer = this.players.get(this.localPlayerId);
            if (localPlayer) {
                console.log("👊 Animation de coup de poing déclenchée !");
                this.animatePlayerPunch(localPlayer, Math.random() > 0.5);
            }
        }

        if (kick) {
            // Animation locale du coup de pied immédiate
            const localPlayer = this.players.get(this.localPlayerId);
            if (localPlayer) {
                console.log("🦶 Animation de coup de pied déclenchée !");
                this.animatePlayerKick(localPlayer, Math.random() > 0.5);
            }
            // Envoyer coup de pied au serveur (si la fonction existe)
            if (networkManager.sendPlayerKick) {
                networkManager.sendPlayerKick();
            }
        }

        // Test d'animation forcée avec T
        if (testAnimation) {
            const localPlayer = this.players.get(this.localPlayerId);
            if (localPlayer && localPlayer.userData.animations) {
                console.log("🧪 Test d'animation forcée !");
                // Forcer une rotation visible du bras gauche
                localPlayer.userData.animations.leftArm.rotation.x = Math.sin(Date.now() * 0.01) * 0.5;
                localPlayer.userData.animations.rightArm.rotation.x = -Math.sin(Date.now() * 0.01) * 0.5;
                localPlayer.userData.animations.torso.rotation.z = Math.sin(Date.now() * 0.005) * 0.2;
            }
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
        const playerGroup = this.players.get(playerId);
        if (!playerGroup) return;

        // Utiliser la nouvelle animation de coup de poing
        const isLeftPunch = Math.random() > 0.5; // Alternance aléatoire
        this.animatePlayerPunch(playerGroup, isLeftPunch);
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

        // Mettre à jour les animations TWEEN
        if (typeof TWEEN !== 'undefined') {
            TWEEN.update();
        }

        this.updatePlayerControls();
        this.updateCamera();
        
        // Animer tous les joueurs en mouvement
        this.players.forEach((playerGroup, playerId) => {
            if (playerGroup && playerGroup.userData && playerGroup.userData.animations) {
                // Calculer la vitesse de déplacement depuis la position précédente
                if (!playerGroup.userData.previousPosition) {
                    playerGroup.userData.previousPosition = playerGroup.position.clone();
                }
                
                const currentPos = playerGroup.position;
                const prevPos = playerGroup.userData.previousPosition;
                const deltaPos = new THREE.Vector3().subVectors(currentPos, prevPos);
                const speed = deltaPos.length() * 60; // Vitesse approximative par seconde
                
                // Seuils pour marche et course
                const isMoving = speed > 0.01; // Seuil plus bas pour détecter les petits mouvements
                const isRunning = speed > 1; // Seuil plus bas aussi
                
                // Toujours animer (même en idle)
                this.animatePlayerMovement(playerGroup, deltaPos.length() > 0.001 ? deltaPos.normalize() : new THREE.Vector3(), isRunning);
                
                // Mettre à jour la position précédente
                playerGroup.userData.previousPosition.copy(currentPos);
            }
        });
        
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