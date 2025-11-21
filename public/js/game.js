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
        this.cameraRig = null;
        this.tmpVec1 = null;
        this.tmpVec2 = null;
        this.lastFrameTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        this.textureLoader = null;
        this.textureCache = {};
        this.dynamicUniforms = [];
        this.clock = null;
        this.fieldGlow = null;
        this.fieldLinesGroup = null;
        
        this.init();
    }

    init() {
        // Vérifier que Three.js est disponible
        if (typeof THREE === 'undefined') {
            console.error('❌ Three.js n\'est pas chargé !');
            throw new Error('Three.js is required but not loaded');
        }

        this.tmpVec1 = new THREE.Vector3();
        this.tmpVec2 = new THREE.Vector3();
        this.textureLoader = new THREE.TextureLoader();
        this.textureCache = {};
        this.dynamicUniforms = [];
        this.clock = new THREE.Clock();
        this.cameraRig = {
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            lookAt: new THREE.Vector3(),
            lookVelocity: new THREE.Vector3()
        };
        this.lastFrameTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        this.createScene();
        this.createLights();
        this.createTerrain();
        // this.createFieldBorders();
        this.createGoals();
        this.createBall();
        this.setupEventListeners();
        this.animate();
        
        console.log('🎮 SoccerBox Game initialisé !');
    }

    createScene() {
        // Scène
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050a16);
        this.scene.fog = new THREE.FogExp2(0x050a16, 0.0085);

        // Caméra
        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect
            0.1, // Near
            1000 // Far
        );
        this.camera.position.set(0, 25, 30);
        this.camera.lookAt(0, 0, 0);

        if (this.cameraRig) {
            this.cameraRig.position.copy(this.camera.position);
            this.cameraRig.lookAt.set(0, 0, 0);
        }

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true 
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;
        this.renderer.physicallyCorrectLights = true;

        // Redimensionnement
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(0x1d2742, 0.4);
        this.scene.add(ambientLight);

        const hemisphereLight = new THREE.HemisphereLight(0x8fc8ff, 0x050912, 0.65);
        hemisphereLight.position.set(0, 80, 0);
        this.scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.95);
        directionalLight.position.set(45, 70, 30);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 300;
        directionalLight.shadow.camera.left = -70;
        directionalLight.shadow.camera.right = 70;
        directionalLight.shadow.camera.top = 45;
        directionalLight.shadow.camera.bottom = -45;
        directionalLight.shadow.radius = 10;
        directionalLight.shadow.blurSamples = 30;
        this.scene.add(directionalLight);

        const rimLight = new THREE.SpotLight(0x6dd7ff, 0.55, 220, Math.PI / 4, 0.35, 1.5);
        rimLight.position.set(-10, 110, -15);
        rimLight.target.position.set(0, 0, 0);
        rimLight.castShadow = false;
        this.scene.add(rimLight);
        this.scene.add(rimLight.target);

        const warmSpot = new THREE.SpotLight(0xff9c6f, 0.45, 180, Math.PI / 3.5, 0.4, 1.2);
        warmSpot.position.set(20, 90, 35);
        warmSpot.target.position.set(0, 0, 0);
        warmSpot.castShadow = false;
        this.scene.add(warmSpot);
        this.scene.add(warmSpot.target);

        const sidelineConfigs = [
            { position: { x: -45, y: 18, z: 0 }, color: 0x7ee8ff, intensity: 0.35, distance: 120 },
            { position: { x: 45, y: 18, z: 0 }, color: 0xff6fb5, intensity: 0.25, distance: 120 },
            { position: { x: 0, y: 18, z: 28 }, color: 0x6fffc5, intensity: 0.3, distance: 90 },
            { position: { x: 0, y: 18, z: -28 }, color: 0x7ee8ff, intensity: 0.3, distance: 90 }
        ];

        sidelineConfigs.forEach((config) => {
            const light = new THREE.PointLight(config.color, config.intensity, config.distance, 2);
            light.position.set(config.position.x, config.position.y, config.position.z);
            this.scene.add(light);
        });
    }



    createTerrain() {
        const fieldGeometry = new THREE.PlaneGeometry(80, 50, 220, 140);
        const grassTexture = this.loadTexture('/medias/terrain/textures/Grass_Light_Green_baseColor.jpeg', 10, 6);

        const fieldMaterial = new THREE.MeshStandardMaterial({
            map: grassTexture,
            color: 0xffffff,
            roughness: 0.85,
            metalness: 0.04,
            envMapIntensity: 0.25
        });

        const uniforms = {
            uTime: { value: 0 },
            uWindStrength: { value: 0.35 },
            uFreqX: { value: 0.32 },
            uFreqZ: { value: 0.55 }
        };

        fieldMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = uniforms.uTime;
            shader.uniforms.uWindStrength = uniforms.uWindStrength;
            shader.uniforms.uFreqX = uniforms.uFreqX;
            shader.uniforms.uFreqZ = uniforms.uFreqZ;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                uniform float uTime;
                uniform float uWindStrength;
                uniform float uFreqX;
                uniform float uFreqZ;
                float waveLayer(vec2 pos, float speed, float offset) {
                    return sin(pos.x * uFreqX + uTime * speed + offset) * 0.5 +
                           cos(pos.y * uFreqZ * 0.6 + uTime * speed * 0.6 + offset) * 0.5;
                }`
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                float bladeSway = waveLayer(vec2(position.x, position.z), 1.4, 0.0);
                float bladeCurl = waveLayer(vec2(position.z, position.x), 0.9, 1.57);
                transformed.y += bladeSway * 0.18 * uWindStrength;
                transformed.x += bladeCurl * 0.03 * uWindStrength;
                transformed.z += bladeSway * 0.02 * uWindStrength;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <output_fragment>',
                `float fresnel = pow(1.0 - saturate(dot(vNormal, vec3(0.0, 1.0, 0.0))), 2.0);
                vec3 neonTint = vec3(0.16, 0.32, 0.28) * fresnel * 0.55;
                gl_FragColor = vec4(outgoingLight + neonTint, diffuseColor.a);`
            );
        };

        fieldMaterial.needsUpdate = true;
        this.dynamicUniforms.push(uniforms);

        this.terrain = new THREE.Mesh(fieldGeometry, fieldMaterial);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);

        this.createFieldGlow();
        this.createFieldLines();
    }

    createFieldLines() {
        if (this.fieldLinesGroup) {
            this.scene.remove(this.fieldLinesGroup);
        }

        const group = new THREE.Group();
        group.position.y = 0.06;

        const softLineMaterial = (color = 0xd3f5ff, intensity = 1.1) => new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: new THREE.Color(color),
            emissiveIntensity: intensity,
            metalness: 0.02,
            roughness: 0.45,
            transparent: true,
            opacity: 0.92
        });

        const addLine = (width, height, position, color, intensity) => {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), softLineMaterial(color, intensity));
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.copy(position);
            group.add(mesh);
        };

        const addRing = (inner, outer, position, color, intensity) => {
            const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 64), softLineMaterial(color, intensity));
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.copy(position);
            group.add(mesh);
        };

        const mainColor = 0xb0ecff;
        const accentBlue = 0x8cd8ff;
        const accentRed = 0xffb5d0;

        addLine(80, 0.18, new THREE.Vector3(0, 0, 0), mainColor, 1.2); // médiane
        addRing(6.7, 7.1, new THREE.Vector3(0, 0, 0), mainColor, 1.1);

        [ -24, 24 ].forEach((z) => {
            addLine(30, 0.18, new THREE.Vector3(0, 0, z), z > 0 ? accentRed : accentBlue, 1.05);
        });

        const addPenaltyBox = (width, height, centerZ, color) => {
            const thickness = 0.2;
            addLine(width, thickness, new THREE.Vector3(0, 0, centerZ + height / 2), color, 1.0);
            addLine(width, thickness, new THREE.Vector3(0, 0, centerZ - height / 2), color, 1.0);
            addLine(thickness, height, new THREE.Vector3(-width / 2, 0, centerZ), color, 1.0);
            addLine(thickness, height, new THREE.Vector3(width / 2, 0, centerZ), color, 1.0);
        };

        addPenaltyBox(30, 12, -18, accentBlue);
        addPenaltyBox(30, 12, 18, accentRed);

        this.scene.add(group);
        this.fieldLinesGroup = group;
    }

    createFieldGlow() {
        if (this.fieldGlow) {
            this.scene.remove(this.fieldGlow);
        }

        const glowGroup = new THREE.Group();
        glowGroup.position.y = 0.02;

        const baseGlowGeometry = new THREE.PlaneGeometry(82, 52);
        const baseGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0x1567c4,
            transparent: true,
            opacity: 0.045,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const baseGlow = new THREE.Mesh(baseGlowGeometry, baseGlowMaterial);
        baseGlow.rotation.x = -Math.PI / 2;
        glowGroup.add(baseGlow);

        this.scene.add(glowGroup);
        this.fieldGlow = glowGroup;
    }

    loadTexture(path, repeatX = 1, repeatY = 1) {
        if (!this.textureLoader) {
            this.textureLoader = new THREE.TextureLoader();
        }

        if (!this.textureCache[path]) {
            const texture = this.textureLoader.load(path);
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(repeatX, repeatY);
            let maxAnisotropy = 4;
            if (this.renderer && this.renderer.capabilities && typeof this.renderer.capabilities.getMaxAnisotropy === 'function') {
                maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
            }
            texture.anisotropy = maxAnisotropy;
            this.textureCache[path] = texture;
        } else {
            this.textureCache[path].repeat.set(repeatX, repeatY);
        }

        return this.textureCache[path];
    }

    createFieldBorders() {
        const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        // Bordures latérales (adaptées à la largeur du terrain : 80)
        const sideGeometry = new THREE.BoxGeometry(80, 2, 1);
        const topBorder = new THREE.Mesh(sideGeometry, borderMaterial);
        topBorder.position.set(0, 1, 25.5); // 50/2 + 0.5 pour la bordure
        topBorder.castShadow = true;
        this.scene.add(topBorder);

        const bottomBorder = new THREE.Mesh(sideGeometry, borderMaterial);
        bottomBorder.position.set(0, 1, -25.5); // -50/2 - 0.5 pour la bordure
        bottomBorder.castShadow = true;
        this.scene.add(bottomBorder);

        // Bordures des extrémités (adaptées à la hauteur du terrain : 50)
        const endGeometry = new THREE.BoxGeometry(1, 2, 50);
        const leftBorder = new THREE.Mesh(endGeometry, borderMaterial);
        leftBorder.position.set(-40.5, 1, 0); // 80/2 + 0.5 pour la bordure
        leftBorder.castShadow = true;
        this.scene.add(leftBorder);

        const rightBorder = new THREE.Mesh(endGeometry, borderMaterial);
        rightBorder.position.set(40.5, 1, 0); // 80/2 + 0.5 pour la bordure
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
    
        // Positions des buts (plus proches des bordures)
        const goalPositions = [
            { z: -24, team: 'blue' },   // But bleu plus proche du centre
            { z: 24, team: 'red' }      // But rouge plus proche du centre
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
    
            // MURS INVISIBLES pour empêcher l'entrée dans les buts
            const goalBlockerMaterial = new THREE.MeshBasicMaterial({ 
                visible: false // Invisible mais collision active
            });
            
            // Bloquer l'entrée du but (devant les poteaux)
            const goalBlockerGeometry = new THREE.BoxGeometry(6, 4, 0.5);
            const goalBlocker = new THREE.Mesh(goalBlockerGeometry, goalBlockerMaterial);
            goalBlocker.position.set(0, 2, goal.z);
            goalGroup.add(goalBlocker);
    
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
            map: this.createSoccerBallTexture(),
            emissive: new THREE.Color(0x11263c),
            emissiveIntensity: 0.35
        });
        
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ball.position.set(0, 0.5, 0);
        this.ball.castShadow = true;
        this.scene.add(this.ball);

        this.ball.userData = {
            smoothPosition: this.ball.position.clone(),
            targetPosition: this.ball.position.clone(),
            velocity: new THREE.Vector3(),
            targetVelocity: new THREE.Vector3(),
            targetSpin: new THREE.Vector3(),
            currentSpin: new THREE.Vector3(),
            lastServerUpdate: 0,
            baseScale: this.ball.scale.clone()
        };
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
        const initialPosition = new THREE.Vector3(
            (playerData.position?.x) || 0,
            (playerData.position?.y) || 0,
            (playerData.position?.z) || 0
        );
        
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
        const gloveGeometry = new THREE.SphereGeometry(0.24, 12, 8);
                gloveGeometry.scale(2.1, 0.8, 1.2); // Forme plus réaliste

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
            },
            smoothPosition: initialPosition.clone(),
            targetPosition: initialPosition.clone(),
            serverPosition: initialPosition.clone(),
            velocity: new THREE.Vector3(),
            targetVelocity: new THREE.Vector3(),
            smoothedRotation: playerData.rotation || 0,
            targetRotation: playerData.rotation || 0,
            smoothedTilt: 0,
            previousPosition: initialPosition.clone(),
            lastServerUpdate: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            isKnockedOut: false
        };

        // Ajouter une animation d'apparition
        this.playSpawnAnimation(playerGroup);

        playerGroup.position.copy(initialPosition);
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
            // leftArm.rotation.x = -0.3; // Position de garde fixe
            // rightArm.rotation.x = -0.3; // Position de garde fixe
            // leftArm.rotation.z = 0.2;   // Coudes écartés
            // rightArm.rotation.z = -0.2; // Coudes écartés
            
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
        if (!playerGroup.userData.animations) {
            console.warn("⚠️ Pas d'animations disponibles pour ce joueur");
            return;
        }
        
        const { torso, head, leftArm, rightArm, leftLeg, rightLeg } = playerGroup.userData.animations;
        const time = Date.now() * 0.001;

        // Position de garde de base
        const guardPosition = -0.3;
        const guardZ = isLeftPunch ? 0.2 : -0.2;
        const otherGuardZ = isLeftPunch ? -0.2 : 0.2;
        
        // Phase d'animation du coup de poing (rapide)
        const punchTime = time + 0.1 * 15; // Vitesse d'animation
        const punchPhase = Math.sin(punchTime);
        // const punchIntensity = 10000 * punchPhase; // Seulement la phase positive
        const punchIntensity = 1; // Seulement la phase positive

        if (isLeftPunch) {
            // Bras gauche qui frappe
            leftArm.rotation.x = guardPosition + (punchIntensity); // Extension vers l'avant
            leftArm.rotation.z = guardZ + (punchIntensity); // Rotation du bras
            leftArm.rotation.y = guardZ + (punchIntensity); // Rotation du bras
            
            // Bras droit reste en garde mais recule légèrement
            rightArm.rotation.x = guardPosition - (punchIntensity * 0.1);
            rightArm.rotation.z = otherGuardZ + (punchIntensity * -0.1);
        } else {
            // Bras droit qui frappe
            rightArm.rotation.x = guardPosition + (punchIntensity * 1); // Extension vers l'avant
            rightArm.rotation.z = guardZ + (punchIntensity * 0.3); // Rotation du bras
            
            // Bras gauche reste en garde mais recule légèrement
            leftArm.rotation.x = guardPosition - (punchIntensity * 0.1);
            leftArm.rotation.z = otherGuardZ + (punchIntensity * 0.1);
        }
        
        // Rotation du torse pour plus de puissance
        torso.rotation.y = (isLeftPunch ? -0.4 : 0.4) * punchIntensity;
        
        // Mouvement de tête pour accompagner
        head.rotation.y = (isLeftPunch ? -0.2 : 0.2) * punchIntensity;
    }
    
    // Animation de célébration
    animatePlayerCelebration(playerGroup) {
        if (!playerGroup.userData.animations) return;
        
        const { torso, head, leftArm, rightArm, leftLeg, rightLeg } = playerGroup.userData.animations;
        
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
            // const loginScreen = document.getElementById('loginScreen');
            // if (loginScreen && !loginScreen.classList.contains('hidden')) {
            //     return;
            // }
            
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
                right: leftPressed,          // A/Gauche devient droite (perspective inversée)
                shift: this.keys['ShiftLeft'] || this.keys['ShiftRight'],
            };
        } else {
            // Équipe rouge : contrôles normaux
            movement = {
                forward: forwardPressed,
                backward: backwardPressed,
                left: leftPressed,
                right: rightPressed,
                shift: this.keys['ShiftLeft'] || this.keys['ShiftRight'],
            };
        }

        const punch = this.keys['Space'] || this.mouseState.clicked;

        // Envoyer les mouvements au serveur
        if (Object.values(movement).some(v => v)) {
            networkManager.sendPlayerMove(movement);
        }

        if (punch) {
            networkManager.sendPlayerPunch();
            this.animatePunch(this.localPlayerId);
        }
    }

    updateGameState(newGameState) {
        this.gameState = newGameState;

        // Mettre à jour les joueurs
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        newGameState.players.forEach(playerData => {
            let playerMesh = this.players.get(playerData.id);
            
            if (!playerMesh) {
                playerMesh = this.createPlayer(playerData);
            }

            const userData = playerMesh.userData || {};
            const incomingPosition = new THREE.Vector3(
                (playerData.position?.x) || 0,
                (playerData.position?.y) || 0,
                (playerData.position?.z) || 0
            );
            const previousServerPosition = userData.serverPosition ? userData.serverPosition.clone() : incomingPosition.clone();
            userData.serverPosition = incomingPosition.clone();

            if (!userData.targetPosition) {
                userData.targetPosition = incomingPosition.clone();
                userData.smoothPosition = incomingPosition.clone();
                playerMesh.position.copy(incomingPosition);
            }

            if (!userData.targetVelocity) {
                userData.targetVelocity = new THREE.Vector3();
            }

            if (!userData.velocity) {
                userData.velocity = new THREE.Vector3();
            }

            const elapsedSeconds = userData.lastServerUpdate ? Math.max((now - userData.lastServerUpdate) / 1000, 0.016) : null;
            if (elapsedSeconds) {
                const velocityEstimate = incomingPosition.clone().sub(previousServerPosition).divideScalar(elapsedSeconds || 0.016);
                userData.targetVelocity.copy(velocityEstimate);
            } else {
                userData.targetVelocity.set(0, 0, 0);
            }

            const leadTime = Math.min(0.12 + userData.targetVelocity.length() * 0.003, 0.25);
            const predictedPosition = incomingPosition.clone().add(userData.targetVelocity.clone().multiplyScalar(leadTime));
            userData.targetPosition.copy(predictedPosition);
            userData.lastServerUpdate = now;
            userData.targetRotation = playerData.rotation || 0;
            userData.isKnockedOut = Boolean(playerData.isKnockedOut);

            // Mettre à jour la santé
            if (playerData.health !== undefined) {
                this.updatePlayerData(playerData.id, playerData.health);
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
        if (newGameState.ball && this.ball) {
            const ballData = this.ball.userData || (this.ball.userData = {});
            const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
            const incomingPosition = new THREE.Vector3(
                (newGameState.ball.position?.x) || 0,
                Math.max(newGameState.ball.position?.y || 0.5, 0.5),
                (newGameState.ball.position?.z) || 0
            );
            const incomingVelocity = new THREE.Vector3(
                (newGameState.ball.velocity?.x) || 0,
                (newGameState.ball.velocity?.y) || 0,
                (newGameState.ball.velocity?.z) || 0
            );

            if (!ballData.smoothPosition) {
                ballData.smoothPosition = incomingPosition.clone();
                this.ball.position.copy(incomingPosition);
            }

            if (!ballData.targetPosition) {
                ballData.targetPosition = incomingPosition.clone();
            }

            if (!ballData.velocity) {
                ballData.velocity = new THREE.Vector3();
            }

            if (!ballData.targetVelocity) {
                ballData.targetVelocity = new THREE.Vector3();
            }

            if (!ballData.targetSpin) {
                ballData.targetSpin = new THREE.Vector3();
            }

            if (!ballData.currentSpin) {
                ballData.currentSpin = new THREE.Vector3();
            }

            const leadTime = Math.min(0.08 + incomingVelocity.length() * 0.0025, 0.2);
            const predictedPosition = incomingPosition.clone().add(incomingVelocity.clone().multiplyScalar(leadTime));

            ballData.targetPosition.copy(predictedPosition);
            ballData.targetVelocity.copy(incomingVelocity);
            ballData.targetSpin.set(
                (newGameState.ball.spin?.x) || 0,
                (newGameState.ball.spin?.y) || 0,
                (newGameState.ball.spin?.z) || 0
            );
            ballData.lastServerUpdate = now;
        }
    }

    animatePunch(playerId) {
        const playerGroup = this.players.get(playerId);
        if (!playerGroup) return;

        // Utiliser la nouvelle animation de coup de poing
        const isLeftPunch = Math.random() > 0.5; // Alternance aléatoire
        this.animatePlayerPunch(playerGroup, isLeftPunch);
    }

    updateCamera(deltaTime) {
        if (!this.localPlayerId || !this.cameraRig) return;

        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;

        const userData = localPlayer.userData || {};
        const teamDirection = (typeof networkManager !== 'undefined' && networkManager.playerTeam === 'blue') ? -1 : 1;
        const velocity = userData.velocity ? userData.velocity.clone() : new THREE.Vector3();
        const anticipation = velocity.clone().multiplyScalar(0.4);
        const dynamicHeight = 14 + Math.min(velocity.length() * 0.15, 6);

        const targetCameraPos = localPlayer.position.clone().add(new THREE.Vector3(
            anticipation.x,
            dynamicHeight,
            anticipation.z + teamDirection * 20
        ));

        if (userData.isKnockedOut) {
            targetCameraPos.y = Math.max(targetCameraPos.y, 10);
        }

        this.applySpring(this.cameraRig.position, targetCameraPos, this.cameraRig.velocity, deltaTime, 45, 10);

        const focusPoint = localPlayer.position.clone().add(anticipation.clone().multiplyScalar(0.35));
        focusPoint.y += userData.isKnockedOut ? 1 : 3;
        this.applySpring(this.cameraRig.lookAt, focusPoint, this.cameraRig.lookVelocity, deltaTime, 60, 12);

        this.camera.position.copy(this.cameraRig.position);
        this.camera.lookAt(this.cameraRig.lookAt);
    }

    updatePlayerInterpolation(deltaTime) {
        if (!deltaTime) return;

        this.players.forEach(playerGroup => {
            const data = playerGroup.userData;
            if (!data || !data.targetPosition || !data.smoothPosition || !data.velocity) {
                return;
            }

            const distance = data.smoothPosition.distanceTo(data.targetPosition);
            if (distance > 25) {
                data.smoothPosition.copy(data.targetPosition);
                data.velocity.set(0, 0, 0);
            } else {
                const stiffness = data.playerId === this.localPlayerId ? 260 : 150;
                const damping = data.playerId === this.localPlayerId ? 32 : 20;
                this.applySpring(data.smoothPosition, data.targetPosition, data.velocity, deltaTime, stiffness, damping);
            }

            playerGroup.position.copy(data.smoothPosition);

            const rotationLambda = data.playerId === this.localPlayerId ? 18 : 12;
            data.smoothedRotation = this.dampValue(
                data.smoothedRotation || 0,
                data.targetRotation || 0,
                rotationLambda,
                deltaTime
            );
            playerGroup.rotation.y = data.smoothedRotation;

            data.smoothedTilt = this.dampValue(
                data.smoothedTilt || 0,
                data.isKnockedOut ? Math.PI / 2 : 0,
                10,
                deltaTime
            );
            playerGroup.rotation.z = data.smoothedTilt;

            if (!data.previousPosition) {
                data.previousPosition = playerGroup.position.clone();
            }
        });
    }

    updatePlayerAnimations(deltaTime) {
        const playerCount = this.players.size;
        let animationCounter = 0;

        this.players.forEach(playerGroup => {
            if (playerCount > 6 && animationCounter > 3) {
                return;
            }

            if (!playerGroup || !playerGroup.userData || !playerGroup.userData.animations) {
                return;
            }

            const data = playerGroup.userData;
            if (!data.previousPosition) {
                data.previousPosition = playerGroup.position.clone();
            }

            const prevPos = data.previousPosition;
            const deltaPos = playerGroup.position.clone().sub(prevPos);
            const deltaLength = deltaPos.length();
            const speed = deltaLength / Math.max(deltaTime, 0.0001);

            if (deltaLength > 0.0001) {
                deltaPos.divideScalar(deltaLength);
            } else {
                deltaPos.set(0, 0, 0);
            }

            const isRunning = speed > 4;
            this.animatePlayerMovement(playerGroup, deltaPos, isRunning);

            prevPos.copy(playerGroup.position);
            animationCounter++;
        });
    }

    updateDynamicUniforms(elapsedTime) {
        if (!this.dynamicUniforms || this.dynamicUniforms.length === 0) {
            return;
        }

        this.dynamicUniforms.forEach((uniforms) => {
            if (uniforms.uTime !== undefined) {
                uniforms.uTime.value = elapsedTime;
            }
        });
    }

    updateBallVisual(deltaTime) {
        if (!this.ball || !this.ball.userData || !deltaTime) {
            return;
        }

        const data = this.ball.userData;
        if (!data.targetPosition || !data.smoothPosition || !data.velocity) {
            return;
        }

        const stiffness = 240;
        const damping = 30;
        this.applySpring(data.smoothPosition, data.targetPosition, data.velocity, deltaTime, stiffness, damping);
        this.ball.position.copy(data.smoothPosition);

        if (data.targetSpin && data.currentSpin) {
            const spinBlend = 1 - Math.exp(-18 * deltaTime);
            data.currentSpin.lerp(data.targetSpin, spinBlend);
            this.ball.rotation.x += data.currentSpin.x * deltaTime;
            this.ball.rotation.y += data.currentSpin.y * deltaTime;
            this.ball.rotation.z += data.currentSpin.z * deltaTime;
        }

        if (data.targetVelocity) {
            const velocityMagnitude = data.targetVelocity.length();
            const stretch = THREE.MathUtils.clamp(velocityMagnitude / 45, 0, 0.35);
            const squash = Math.max(0.65, 1 - stretch * 0.6);
            const stretchValue = 1 + stretch;
            this.ball.scale.set(stretchValue, squash, stretchValue);

            if (this.ball.material && this.ball.material.emissive) {
                const spinIntensity = data.currentSpin ? data.currentSpin.length() : 0;
                const glowBoost = THREE.MathUtils.clamp(spinIntensity / 50, 0, 0.6);
                this.ball.material.emissiveIntensity = 0.35 + glowBoost;
            }
        }
    }

    applySpring(current, target, velocity, deltaTime, stiffness = 120, damping = 18) {
        if (!current || !target || !velocity || deltaTime <= 0 || !this.tmpVec1 || !this.tmpVec2) {
            return;
        }

        const displacement = this.tmpVec1.copy(target).sub(current);
        const springForce = displacement.multiplyScalar(stiffness);
        const dampingForce = this.tmpVec2.copy(velocity).multiplyScalar(damping);
        const acceleration = springForce.sub(dampingForce);

        velocity.add(acceleration.multiplyScalar(deltaTime));
        current.add(this.tmpVec1.copy(velocity).multiplyScalar(deltaTime));
    }

    dampValue(current, target, lambda, deltaTime) {
        if (deltaTime <= 0 || !isFinite(deltaTime)) {
            return target;
        }
        const t = 1 - Math.exp(-lambda * deltaTime);
        return current + (target - current) * t;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.1) || 1 / 60;
        const elapsedTime = this.clock ? this.clock.getElapsedTime() : now * 0.001;
        this.lastFrameTime = now;

        if (typeof TWEEN !== 'undefined') {
            TWEEN.update();
        }

        this.updatePlayerControls();
        this.updatePlayerInterpolation(deltaTime);
        this.updateCamera(deltaTime);
        this.updatePlayerAnimations(deltaTime);
        this.updateBallVisual(deltaTime);
        this.updateDynamicUniforms(elapsedTime);
        
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

    updatePlayerData(playerId, newHealth) {
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