// physics.js - Système physique avec Cannon.js
class PhysicsManager {
    constructor() {
        this.world = null;
        this.bodies = new Map(); // Map des corps physiques
        this.ballBody = null;
        this.playerBodies = new Map();
        
        this.init();
    }

    init() {
        // Vérifier que Cannon.js est disponible
        if (typeof CANNON === 'undefined') {
            console.error('❌ Cannon.js n\'est pas chargé !');
            throw new Error('Cannon.js is required but not loaded');
        }

        // Créer le monde physique OPTIMISÉ pour hautes vitesses
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Gravité terrestre
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 20; // Plus d'itérations pour hautes vitesses
        
        // PARAMÈTRES CRITIQUES pour hautes vitesses
        this.world.allowSleep = false; // Empêcher la mise en veille
        this.world.solver.tolerance = 0.001; // Tolérance plus stricte

        // Matériaux physiques
        this.createMaterials();
        
        // Sol du terrain
        this.createGroundBody();
        
        // Murs invisibles pour les limites du terrain
        this.createFieldBounds();
        
        console.log('⚡ Système physique initialisé avec Cannon.js');
    }

    createMaterials() {
        // Matériau du sol
        this.groundMaterial = new CANNON.Material('ground');
        
        // Matériau des joueurs
        this.playerMaterial = new CANNON.Material('player');
        
        // Matériau du ballon
        this.ballMaterial = new CANNON.Material('ball');
        
        // Interactions entre matériaux (syntaxe compatible 0.6.2)
        
        // Sol-Ballon : AUCUN rebond - ballon totalement au sol
        const ballGroundContact = new CANNON.ContactMaterial(
            this.ballMaterial, 
            this.groundMaterial, 
            {
                friction: 0.9, // Friction maximale
                restitution: 0.0, // AUCUN rebond
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(ballGroundContact);
        
        // Joueur-Sol : friction élevée, pas de rebond
        const playerGroundContact = new CANNON.ContactMaterial(
            this.playerMaterial, 
            this.groundMaterial, 
            {
                friction: 0.8,
                restitution: 0.1,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(playerGroundContact);
        
        // Joueur-Ballon : AUCUN rebond
        const playerBallContact = new CANNON.ContactMaterial(
            this.playerMaterial, 
            this.ballMaterial, 
            {
                friction: 0.6, // Friction pour contrôle
                restitution: 0.0, // AUCUN rebond
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(playerBallContact);
        
        // Joueur-Joueur : collisions élastiques
        const playerPlayerContact = new CANNON.ContactMaterial(
            this.playerMaterial, 
            this.playerMaterial, 
            {
                friction: 0.2,
                restitution: 0.4,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(playerPlayerContact);
    }

    createGroundBody() {
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({ 
            mass: 0, // Corps statique
            material: this.groundMaterial 
        });
        this.groundBody.addShape(groundShape);
        this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.add(this.groundBody);
    }

    createFieldBounds() {
        // TERRAIN OUVERT - Pas de murs physiques pour plus de liberté !
        console.log('🌍 Terrain ouvert créé - pas de limites physiques');
        
        // Seulement les poteaux de but pour marquer les zones
        this.createGoalPosts();
    }

    createGoalPosts() {
        const postRadius = 0.2;
        const postHeight = 4;
        const goalWidth = 6;
        
        const goalPositions = [25, -25]; // Positions Z des buts (terrain agrandi)
        
        goalPositions.forEach(goalZ => {
            // Poteaux gauche et droit
            [-goalWidth/2, goalWidth/2].forEach(postX => {
                const postShape = new CANNON.Cylinder(postRadius, postRadius, postHeight, 8);
                const postBody = new CANNON.Body({ 
                    mass: 0,
                    material: this.groundMaterial 
                });
                postBody.addShape(postShape);
                postBody.position.set(postX, postHeight/2, goalZ);
                this.world.add(postBody);
            });
            
            // Barre transversale
            const crossbarShape = new CANNON.Cylinder(postRadius, postRadius, goalWidth, 8);
            const crossbarBody = new CANNON.Body({ 
                mass: 0,
                material: this.groundMaterial 
            });
            crossbarBody.addShape(crossbarShape);
            crossbarBody.position.set(0, postHeight, goalZ);
            crossbarBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
            this.world.add(crossbarBody);
        });
    }

    createBallBody(position = { x: 0, y: 0.5, z: 0 }) {
        const ballRadius = 0.5;
        const ballShape = new CANNON.Sphere(ballRadius);
        
        this.ballBody = new CANNON.Body({ 
            mass: 1,
            material: this.ballMaterial 
        });
        this.ballBody.addShape(ballShape);
        this.ballBody.position.set(position.x, position.y, position.z);
        
        // Amortissement MAXIMUM ABSOLU pour clouer le ballon au sol
        this.ballBody.linearDamping = 0.99; // EXTRÊME : freine presque totalement
        this.ballBody.angularDamping = 0.95; // EXTRÊME : freine la rotation au maximum
        
        this.world.add(this.ballBody);
        return this.ballBody;
    }

    createPlayerBody(playerId, position, team) {
        const playerRadius = 0.8;
        const playerHeight = 2;
        
        // Utiliser une capsule pour le corps du joueur
        const playerShape = new CANNON.Cylinder(playerRadius, playerRadius, playerHeight, 8);
        
        const playerBody = new CANNON.Body({ 
            mass: 80, // kg
            material: this.playerMaterial 
        });
        playerBody.addShape(playerShape);
        playerBody.position.set(position.x, position.y, position.z);
        
        // Empêcher les rotations indésirables
        playerBody.fixedRotation = true;
        playerBody.updateMassProperties();
        
        // AUCUN amortissement - vitesse MAXIMALE
        playerBody.linearDamping = 0.0; // ZÉRO résistance !
        playerBody.angularDamping = 0.0; // ZÉRO résistance !
        
        this.world.add(playerBody);
        this.playerBodies.set(playerId, playerBody);
        
        return playerBody;
    }

    removePlayerBody(playerId) {
        const body = this.playerBodies.get(playerId);
        if (body) {
            this.world.remove(body);
            this.playerBodies.delete(playerId);
        }
    }

    applyPlayerMovement(playerId, movement, deltaTime) {
        const body = this.playerBodies.get(playerId);
        if (!body) return;

        // Mouvement fluide et rapide
        const moveForce = 3000; // Force élevée mais fluide
        const force = new CANNON.Vec3(0, 0, 0);
        
        if (movement.forward) force.z -= moveForce;
        if (movement.backward) force.z += moveForce;
        if (movement.left) force.x -= moveForce;
        if (movement.right) force.x += moveForce;
        
        // Appliquer la force au centre de masse
        body.applyForce(force, body.position);
        
        // Limiter la vitesse maximale pour éviter les bugs
        const maxSpeed = 50;
        const velocity = body.velocity;
        const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        if (horizontalSpeed > maxSpeed) {
            const scale = maxSpeed / horizontalSpeed;
            body.velocity.x *= scale;
            body.velocity.z *= scale;
        }
    }

    applyPlayerPunch(playerId, targetPosition, force = 1000) {
        const playerBody = this.playerBodies.get(playerId);
        if (!playerBody) return;

        const playerPos = playerBody.position;
        const direction = new CANNON.Vec3(
            targetPosition.x - playerPos.x,
            0,
            targetPosition.z - playerPos.z
        );
        direction.normalize();

        // Vérifier s'il y a des joueurs ou le ballon dans la zone de frappe
        const punchRange = 2.5;
        
        // Coup de poing sur le ballon (interdit - seulement pour repousser)
        if (this.ballBody) {
            const ballDistance = playerPos.distanceTo(this.ballBody.position);
            if (ballDistance <= punchRange) {
                // Repousser le ballon sans le toucher avec les mains
                const pushDirection = direction.clone();
                pushDirection.y = 0.2; // Petite composante verticale
                this.ballBody.applyImpulse(pushDirection.scale(force * 0.3), this.ballBody.position);
            }
        }

        // Coup de poing sur les autres joueurs
        this.playerBodies.forEach((targetBody, targetId) => {
            if (targetId === playerId) return;
            
            const distance = playerPos.distanceTo(targetBody.position);
            if (distance <= punchRange) {
                // Appliquer l'impulsion de coup
                const punchDirection = direction.clone();
                punchDirection.y = 0.1; // Légère composante vers le haut
                targetBody.applyImpulse(punchDirection.scale(force), targetBody.position);
                
                // Effet de recul sur l'attaquant
                const recoilDirection = direction.clone().negate();
                playerBody.applyImpulse(recoilDirection.scale(force * 0.2), playerBody.position);
                
                return { targetId, hit: true };
            }
        });
    }

    kickBall(playerId, direction, force = 1000) { // Force optimisée pour rester au sol
        const playerBody = this.playerBodies.get(playerId);
        if (!playerBody || !this.ballBody) return;

        const playerPos = playerBody.position;
        const ballPos = this.ballBody.position;
        const distance = playerPos.distanceTo(ballPos);
        
        // Distance maximale pour taper dans le ballon avec les pieds
        const kickRange = 1.5; // Portée légèrement augmentée
        
        if (distance <= kickRange) {
            const kickDirection = new CANNON.Vec3(direction.x, 0.01, direction.z); // Trajectoire rase
            kickDirection.normalize();
            
            // Appliquer l'impulsion au ballon - force réduite pour éviter les vols
            this.ballBody.applyImpulse(kickDirection.scale(force), ballPos);
            
            return true;
        }
        
        return false;
    }

    checkGoal(ballPosition) {
        const goalLine = 14.5; // Distance de la ligne de but
        const goalWidth = 3; // Demi-largeur du but
        const goalHeight = 4;
        
        // But équipe rouge (côté positif Z)
        if (ballPosition.z > goalLine && 
            Math.abs(ballPosition.x) < goalWidth && 
            ballPosition.y < goalHeight) {
            return 'blue'; // L'équipe bleue marque
        }
        
        // But équipe bleue (côté négatif Z)
        if (ballPosition.z < -goalLine && 
            Math.abs(ballPosition.x) < goalWidth && 
            ballPosition.y < goalHeight) {
            return 'red'; // L'équipe rouge marque
        }
        
        return null;
    }

    resetBallPosition() {
        if (this.ballBody) {
            this.ballBody.position.set(0, 0.5, 0);
            this.ballBody.velocity.set(0, 0, 0);
            this.ballBody.angularVelocity.set(0, 0, 0);
        }
    }

    teleportPlayer(playerId, position) {
        const body = this.playerBodies.get(playerId);
        if (body) {
            body.position.set(position.x, position.y, position.z);
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
        }
    }

    update(deltaTime) {
        // Mettre à jour le monde physique
        this.world.step(deltaTime);
        
        // Maintenir les joueurs debout (empêcher les chutes)
        this.playerBodies.forEach(body => {
            // S'assurer que le joueur reste à la bonne hauteur
            if (body.position.y < 1) {
                body.position.y = 1;
                body.velocity.y = Math.max(0, body.velocity.y);
            }
            
            // Empêcher les rotations excessives
            body.quaternion.set(0, 0, 0, 1);
        });
        
        // CONTRAINTE EXTRÊME : BALLON COMPLÈTEMENT CLOUÉ AU SOL
        if (this.ballBody) {
            // FORCER le ballon à ne JAMAIS dépasser 0.505 (saut de 0.005 max = 100x moins haut)
            if (this.ballBody.position.y > 0.505) {
                this.ballBody.position.y = 0.505; // CLOUÉ au sol
            }
            
            // ÉLIMINER TOTALEMENT toute vélocité verticale > 0.01 (100x moins)
            if (this.ballBody.velocity.y > 0.01) {
                this.ballBody.velocity.y = 0; // ZÉRO saut
            }
            
            // Empêcher même les micro-rebonds
            if (this.ballBody.velocity.y > 0) {
                this.ballBody.velocity.y *= 0.01; // Diviser par 100
            }
            
            // Position minimale stricte
            if (this.ballBody.position.y < 0.5) {
                this.ballBody.position.y = 0.5;
                this.ballBody.velocity.y = 0;
            }
        }
    }

    getPlayerPosition(playerId) {
        const body = this.playerBodies.get(playerId);
        return body ? {
            x: body.position.x,
            y: body.position.y,
            z: body.position.z
        } : null;
    }

    getBallPosition() {
        return this.ballBody ? {
            x: this.ballBody.position.x,
            y: this.ballBody.position.y,
            z: this.ballBody.position.z
        } : null;
    }

    getBallVelocity() {
        return this.ballBody ? {
            x: this.ballBody.velocity.x,
            y: this.ballBody.velocity.y,
            z: this.ballBody.velocity.z
        } : null;
    }

    // Raycasting pour détecter les objets
    raycast(from, to) {
        const raycastResult = new CANNON.RaycastResult();
        this.world.rayTest(
            new CANNON.Vec3(from.x, from.y, from.z),
            new CANNON.Vec3(to.x, to.y, to.z),
            raycastResult
        );
        
        return raycastResult.hasHit ? {
            hit: true,
            point: raycastResult.hitPointWorld,
            body: raycastResult.body,
            distance: raycastResult.distance
        } : { hit: false };
    }

    // Debug: afficher les corps physiques en wireframe
    addDebugVisualization(scene) {
        if (typeof CannonDebugRenderer !== 'undefined') {
            this.debugRenderer = new CannonDebugRenderer(scene, this.world);
        }
    }

    updateDebugVisualization() {
        if (this.debugRenderer) {
            this.debugRenderer.update();
        }
    }
}

// Instance globale du gestionnaire physique
const physicsManager = new PhysicsManager();