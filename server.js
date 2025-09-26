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
        rotation: { x: 0, y: 0, z: 0 }
    },
    score: {
        blue: 0,
        red: 0
    },
    gameStarted: false,
    gameTime: 0,
    maxPlayers: 8
};

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
        // Envoyer la mise à jour de santé
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
        const speed = running ? 15 : 10;
        const factor = 0.6;

        if (running) {
            player.takeDamage(0.1);
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
}

function updateBall(dt) {
    const ball = gameState.ball;
    const gravity = -0.01;
    const bounce = 0.1; // Rebond léger mais réaliste
    const friction = 0.10;
    const factor = 15;
    
    // Appliquer la gravité
    ball.velocity.y += gravity * dt * factor * 150;
    
    // Mettre à jour la position
    ball.position.x += ball.velocity.x * dt * factor * 15;
    ball.position.y += ball.velocity.y * dt * factor * 2;
    ball.position.z += ball.velocity.z * dt * factor * 15;

    // Collision avec le sol - rebond normal
    if (ball.position.y <= 0.5) {
        ball.position.y = 0.5;
        ball.velocity.y = -ball.velocity.y * bounce;
        ball.velocity.x *= friction * dt;
        ball.velocity.z *= friction * dt;
    }
    
    // Limites du terrain normales mais agrandies
    if (Math.abs(ball.position.x) > 40) {
        ball.velocity.x = -ball.velocity.x * bounce;
        ball.position.x = Math.sign(ball.position.x) * 40;
    }
    
    if (Math.abs(ball.position.z) > 25) {
        ball.velocity.z = -ball.velocity.z * bounce;
        ball.position.z = Math.sign(ball.position.z) * 25;
    }
    
    // Vérifier les buts
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
            // Kick normal avec plus de puissance
            const kickForce = 15; // Force augmentée mais raisonnable
            const dx = gameState.ball.position.x - player.position.x;
            const dz = gameState.ball.position.z - player.position.z;
            const norm = Math.sqrt(dx * dx + dz * dz);
            
            if (norm > 0) {
                gameState.ball.velocity.x += (dx / norm) * kickForce * dt;
                gameState.ball.velocity.z += (dz / norm) * kickForce * dt;
                gameState.ball.velocity.y += 3;
            }
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