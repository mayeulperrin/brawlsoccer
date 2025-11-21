const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Configuration Express
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Route API pour lister les fichiers audio
const fs = require('fs');
app.get('/api/sounds/:folder', (req, res) => {
    const folder = req.params.folder;
    const soundsPath = path.join(__dirname, 'public', 'medias', folder);
    
    try {
        // Vérifier si le dossier existe
        if (!fs.existsSync(soundsPath)) {
            return res.status(404).json({ error: 'Dossier non trouvé' });
        }
        
        // Lire les fichiers du dossier
        const files = fs.readdirSync(soundsPath);
        
        // Filtrer seulement les fichiers audio
        const audioFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext);
        });
    
        res.json(audioFiles);
        
    } catch (error) {
        console.error(`Erreur lecture dossier ${folder}:`, error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// État du jeu
const gameState = {
    players: new Map(),
    ball: {
        position: { x: 0, y: 0.5, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        spin: { x: 0, y: 0, z: 0 }
    },
    score: {
        blue: 0,
        red: 0
    },
    gameStarted: false,
    gameTime: 0,
    maxPlayers: 8
};

const FIELD_HALF_WIDTH = 40;
const FIELD_HALF_LENGTH = 25;
const BALL_RADIUS = 0.5;
const GRAVITY = -22; // Conserve un ballon ras du sol tout en gardant un arc crédible
const BALL_PHYSICS = Object.freeze({
    MASS: 0.43,
    DRAG: 0.2,
    MAGNUS: 0.035,
    SPIN_DECAY: 1.45,
    BOUNCE: 0.42,
    GROUND_FRICTION: 7.4,
    ROLL_DRAG: 0.45,
    MAX_SPEED: 42,
    MAX_VERTICAL_SPEED: 12,
    MAX_SPIN: 65
});

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function limitPlanarVelocity(velocity, maxMagnitude) {
    const planarSpeed = Math.hypot(velocity.x, velocity.z);
    if (planarSpeed > maxMagnitude) {
        const scale = maxMagnitude / planarSpeed;
        velocity.x *= scale;
        velocity.z *= scale;
    }
}

function limitVector(vector, maxMagnitude) {
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (magnitude > maxMagnitude) {
        const scale = maxMagnitude / magnitude;
        vector.x *= scale;
        vector.y *= scale;
        vector.z *= scale;
    }
}

// Classes pour les entités du jeu
class Player {
    constructor(id, name, team, ioInstance) {
        this.id = id;
        this.name = name;
        this.team = team; // 'blue' ou 'red'
        this.position = this.getSpawnPosition(team);
        this.rotation = 0; // Rotation normale pour tous
        this.velocity = { x: 0, y: 0, z: 0 };
        this.health = 100;
        this.isKnockedOut = false;
        this.lastPunch = 0;
        this.punchCooldown = 500; // ms
        this.connected = true;
        this.io = ioInstance;
        this.giveKOCount = 0; // Nombre de KO donnés
        this.receiveKOCount = 0; // Nombre de KO subis
    }

    getSpawnPosition(team) {
        const x = team === 'blue' ? -15 + Math.random() * 5 : 15 - Math.random() * 5;
        const z = (Math.random() - 0.5) * 10;
        return { x, y: 1, z };
    }

    canPunch() {
        return Date.now() - this.lastPunch > this.punchCooldown && !this.isKnockedOut;
    }

    punch() {
        if (this.canPunch()) {
            this.lastPunch = Date.now();
            return true;
        }
        return false;
    }

    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        if (this.health === 0) {
            this.knockout();
        }
        return this.health;
    }

    knockout() {
        this.isKnockedOut = true;
        setTimeout(() => {
            this.health = 100;
            this.isKnockedOut = false;
            this.position = this.getSpawnPosition(this.team);
            this.receiveKOCount++; // Incrémenter le nombre de KO subis
            
            // Envoyer l'événement de réapparition
            this.io.emit('player-respawn', {
                playerId: this.id,
                health: this.health,
                position: this.position,
                receiveKOCount: this.receiveKOCount,
                giveKOCount: this.giveKOCount
            });
        }, 3000); // 3 secondes de knockout
    }

    update(dt) {
        // Appliquer la friction
        this.velocity.x *= 0.9;
        this.velocity.z *= 0.9;
        
        // Mettre à jour la position
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
        
        // Limiter aux bords du terrain agrandi
        this.position.x = Math.max(-40, Math.min(40, this.position.x));
        this.position.z = Math.max(-25, Math.min(25, this.position.z));
    }
}

// Gestionnaire des connexions
io.on('connection', (socket) => {
    // Connexion d'un joueur
    socket.on('join-game', (playerName) => {
        if (gameState.players.size >= gameState.maxPlayers) {
            socket.emit('game-full');
            return;
        }

        // Déterminer l'équipe
        const blueTeam = Array.from(gameState.players.values()).filter(p => p.team === 'blue').length;
        const redTeam = Array.from(gameState.players.values()).filter(p => p.team === 'red').length;
        const team = blueTeam <= redTeam ? 'blue' : 'red';

        // Créer le joueur
        const player = new Player(socket.id, playerName, team, io);
        gameState.players.set(socket.id, player);

        // Envoyer l'état initial au joueur
        socket.emit('player-joined', {
            playerId: socket.id,
            team: team,
            gameState: getClientGameState()
        });

        // Notifier tous les joueurs
        io.emit('player-update', getClientGameState());

        // Démarrer la partie si assez de joueurs
        if (gameState.players.size >= 2 && !gameState.gameStarted) {
            startGame();
        }
    });

    // Mouvement du joueur
    socket.on('player-move', (data) => {
        const player = gameState.players.get(socket.id);
        if (!player || player.isKnockedOut) return;

        const { direction, rotation, running } = data;
        const speed = running ? 25 : 13;
        const factor = 1;

        if (running) {
            player.takeDamage(1);
        }
        
        // Mouvement fluide avec vélocité - MÊMES contrôles pour tous
        if (direction.forward) player.velocity.z -= speed * factor;
        if (direction.backward) player.velocity.z += speed * factor;
        if (direction.left) player.velocity.x -= speed * factor;
        if (direction.right) player.velocity.x += speed * factor;
        
        player.rotation = data.rotation || player.rotation;
    });

    // Coup de poing
    socket.on('player-punch', () => {
        const player = gameState.players.get(socket.id);
        if (!player || !player.punch()) return;

        // Vérifier les collisions avec d'autres joueurs
        const punchRange = 3;
        let punchDamage = 20;

        if (player.health <= 50) {
            punchDamage = 25;
        }

        if (player.health <= 10) {
            punchDamage = 50;
        }

        gameState.players.forEach((target, targetId) => {
            if (targetId === socket.id || target.isKnockedOut) return;

            const distance = Math.sqrt(
                Math.pow(player.position.x - target.position.x, 2) +
                Math.pow(player.position.z - target.position.z, 2)
            );

            if (distance <= punchRange) {
                const newHealth = target.takeDamage(punchDamage);

                if (newHealth === 0) {
                    player.giveKOCount++;
                }
                
                // Repousser le joueur touché
                const pushForce = 5;
                const dx = target.position.x - player.position.x;
                const dz = target.position.z - player.position.z;
                const norm = Math.sqrt(dx * dx + dz * dz);
                
                target.velocity.x += (dx / norm) * pushForce;
                target.velocity.z += (dz / norm) * pushForce;

                io.emit('player-hit', {
                    attackerId: socket.id,
                    targetId: targetId,
                    damage: punchDamage,
                    newHealth: newHealth,
                    knockout: target.isKnockedOut
                });
            }
        });

        // Diffuser l'action de coup
        io.emit('player-action', {
            playerId: socket.id,
            action: 'punch',
            position: player.position
        });
    });

    // Déconnexion
    socket.on('disconnect', () => {
        const player = gameState.players.get(socket.id);
        if (player) {
            gameState.players.delete(socket.id);
            io.emit('player-left', socket.id);
            
            // Arrêter la partie si pas assez de joueurs
            if (gameState.players.size < 2 && gameState.gameStarted) {
                stopGame();
            }
        }
    });
});

// Fonctions du jeu
function startGame() {
    gameState.gameStarted = true;
    gameState.gameTime = 0;
    gameState.score = { blue: 0, red: 0 };
    
    // Réinitialiser le ballon
    gameState.ball.position = { x: 0, y: 0.5, z: 0 };
    gameState.ball.velocity = { x: 0, y: 0, z: 0 };
    gameState.ball.spin = { x: 0, y: 0, z: 0 };

    io.emit('game-started');
}

function stopGame() {
    gameState.gameStarted = false;
    io.emit('game-stopped');
}

function checkGoal() {
    const ball = gameState.ball;
    const goalZ = 24; // Distance du but
    const goalWidth = 3; // CORRECTION: Réduire de 6 à 3 pour correspondre aux poteaux visuels (±3 = largeur 6)
    
    // But équipe rouge (côté positif)
    if (ball.position.z > goalZ && Math.abs(ball.position.x) < goalWidth) {
        gameState.score.blue++;
        resetBall();
        io.emit('goal', { team: 'blue', score: gameState.score });
        checkWinCondition();
    }
    
    // But équipe bleue (côté négatif)
    if (ball.position.z < -goalZ && Math.abs(ball.position.x) < goalWidth) {
        gameState.score.red++;
        resetBall();
        io.emit('goal', { team: 'red', score: gameState.score });
        checkWinCondition();
    }
}

function checkWinCondition() {
    const maxScore = 3;
    if (gameState.score.blue >= maxScore || gameState.score.red >= maxScore) {
        const winner = gameState.score.blue >= maxScore ? 'blue' : 'red';
        io.emit('game-end', { winner, finalScore: gameState.score });
        
        setTimeout(() => {
            startGame(); // Redémarrer une nouvelle partie
        }, 5000);
    }
}

function resetBall() {
    gameState.ball.position = { x: 0, y: 0.5, z: 0 };
    gameState.ball.velocity = { x: 0, y: 0, z: 0 };
    gameState.ball.spin = { x: 0, y: 0, z: 0 };
}

function updateBall(dt) {
    const ball = gameState.ball;
    const vel = ball.velocity;
    const spin = ball.spin;

    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    if (speed > 0.0001) {
        const dragScale = BALL_PHYSICS.DRAG * speed * dt;
        vel.x -= vel.x * dragScale;
        vel.y -= vel.y * dragScale * 0.6; // Laisser un peu de portance verticale
        vel.z -= vel.z * dragScale;
    }

    // Magnus effect: spin x vitesse
    const magnusFactor = BALL_PHYSICS.MAGNUS * dt;
    const magnusX = (spin.y * vel.z - spin.z * vel.y) * magnusFactor;
    const magnusY = (spin.z * vel.x - spin.x * vel.z) * magnusFactor;
    const magnusZ = (spin.x * vel.y - spin.y * vel.x) * magnusFactor;
    vel.x += magnusX;
    vel.y += magnusY;
    vel.z += magnusZ;

    vel.y += GRAVITY * dt;

    ball.position.x += vel.x * dt;
    ball.position.y += vel.y * dt;
    ball.position.z += vel.z * dt;

    const groundLevel = BALL_RADIUS;
    if (ball.position.y <= groundLevel) {
        ball.position.y = groundLevel;
        if (vel.y < 0) {
            vel.y = -vel.y * BALL_PHYSICS.BOUNCE;
        }

        vel.x *= Math.max(0, 1 - BALL_PHYSICS.GROUND_FRICTION * dt);
        vel.z *= Math.max(0, 1 - BALL_PHYSICS.GROUND_FRICTION * dt);
    }

    // Roulement: amortir progressivement quand le ballon glisse
    if (ball.position.y <= groundLevel + 0.05 && Math.abs(vel.y) < 0.2) {
        vel.x *= Math.max(0, 1 - BALL_PHYSICS.ROLL_DRAG * dt);
        vel.z *= Math.max(0, 1 - BALL_PHYSICS.ROLL_DRAG * dt);
    }

    if (ball.position.y < groundLevel) {
        ball.position.y = groundLevel;
    }

    if (Math.abs(ball.position.x) > FIELD_HALF_WIDTH) {
        ball.position.x = Math.sign(ball.position.x) * FIELD_HALF_WIDTH;
        vel.x = -vel.x * BALL_PHYSICS.BOUNCE;
    }

    if (Math.abs(ball.position.z) > FIELD_HALF_LENGTH) {
        ball.position.z = Math.sign(ball.position.z) * FIELD_HALF_LENGTH;
        vel.z = -vel.z * BALL_PHYSICS.BOUNCE;
    }

    limitPlanarVelocity(vel, BALL_PHYSICS.MAX_SPEED);
    vel.y = clamp(vel.y, -BALL_PHYSICS.MAX_VERTICAL_SPEED, BALL_PHYSICS.MAX_VERTICAL_SPEED);

    const spinDecay = Math.exp(-BALL_PHYSICS.SPIN_DECAY * dt);
    spin.x *= spinDecay;
    spin.y *= spinDecay;
    spin.z *= spinDecay;
    limitVector(spin, BALL_PHYSICS.MAX_SPIN);

    checkGoal();
}

function updatePlayers(dt) {
    gameState.players.forEach((player) => {
        player.update(dt);
        
        // Interaction avec le ballon (pieds seulement)
        const ballDistance = Math.sqrt(
            Math.pow(player.position.x - gameState.ball.position.x, 2) +
            Math.pow(player.position.z - gameState.ball.position.z, 2)
        );
        
        if (ballDistance < 1.5 && !player.isKnockedOut) {
            const ballState = gameState.ball;
            const dx = ballState.position.x - player.position.x;
            const dz = ballState.position.z - player.position.z;
            const norm = Math.sqrt(dx * dx + dz * dz) || 1;
            const direction = { x: dx / norm, z: dz / norm };

            const playerSpeed = Math.hypot(player.velocity.x, player.velocity.z);
            const baseKick = 25;
            const speedBonus = clamp(playerSpeed * 0.35, 0, 8);
            const kickPower = baseKick + speedBonus;

            ballState.velocity.x += direction.x * kickPower;
            ballState.velocity.z += direction.z * kickPower;
            ballState.velocity.y = Math.max(ballState.velocity.y, 4 + speedBonus * 0.6);

            const tangent = { x: -direction.z, z: direction.x };
            const lateralComponent = player.velocity.x * tangent.x + player.velocity.z * tangent.z;
            const forwardComponent = player.velocity.x * direction.x + player.velocity.z * direction.z;

            ballState.spin.y += clamp(lateralComponent * 2.2, -BALL_PHYSICS.MAX_SPIN, BALL_PHYSICS.MAX_SPIN);
            ballState.spin.x += clamp(-forwardComponent * 1.2, -BALL_PHYSICS.MAX_SPIN, BALL_PHYSICS.MAX_SPIN);
            limitVector(ballState.spin, BALL_PHYSICS.MAX_SPIN);

            limitPlanarVelocity(ballState.velocity, BALL_PHYSICS.MAX_SPEED);
        }
    });
}

function getClientGameState() {
    return {
        players: Array.from(gameState.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            team: p.team,
            position: p.position,
            rotation: p.rotation,
            health: p.health,
            isKnockedOut: p.isKnockedOut,
            giveKOCount: p.giveKOCount,
            receiveKOCount: p.receiveKOCount
        })),
        ball: gameState.ball,
        score: gameState.score,
        gameStarted: gameState.gameStarted,
        gameTime: gameState.gameTime
    };
}

// Boucle de jeu principale
let lastTime = Date.now();
const targetFPS = 60;
const updateInterval = 1000 / targetFPS;

setInterval(() => {
    const currentTime = Date.now();
    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    if (gameState.gameStarted) {
        updatePlayers(dt);
        updateBall(dt);
        gameState.gameTime += dt;
        
        // Envoyer l'état du jeu aux clients
        io.emit('game-update', getClientGameState());
    }
}, updateInterval);

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur SoccerBox démarré sur le port ${PORT}`);
    console.log(`🌐 Ouvrez http://localhost:${PORT} dans votre navigateur`);
    console.log(`⚽ Prêt pour le football-boxe multijoueur !`);
});

module.exports = { app, server, io };