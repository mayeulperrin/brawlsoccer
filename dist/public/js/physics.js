class PhysicsManager {
    constructor() {
        this.world = null;
        this.bodies = new Map(); 
        this.ballBody = null;
        this.playerBodies = new Map();
        this.init();
    }
    init() {
        if (typeof CANNON === 'undefined') {
            console.error('❌ Cannon.js n\'est pas chargé !');
            throw new Error('Cannon.js is required but not loaded');
        }
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); 
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 20; 
        this.world.allowSleep = false; 
        this.world.solver.tolerance = 0.001; 
        this.createMaterials();
        this.createGroundBody();
        this.createFieldBounds();
        console.log('⚡ Système physique initialisé avec Cannon.js');
    }
    createMaterials() {
        this.groundMaterial = new CANNON.Material('ground');
        this.playerMaterial = new CANNON.Material('player');
        this.ballMaterial = new CANNON.Material('ball');
        const ballGroundContact = new CANNON.ContactMaterial(
            this.ballMaterial, 
            this.groundMaterial, 
            {
                friction: 0.9, 
                restitution: 0.3,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(ballGroundContact);
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
        const playerBallContact = new CANNON.ContactMaterial(
            this.playerMaterial, 
            this.ballMaterial, 
            {
                friction: 0.6, 
                restitution: 0.0, 
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(playerBallContact);
        const playerPlayerContact = new CANNON.ContactMaterial(
            this.playerMaterial, 
            this.playerMaterial, 
            {
            friction: 0.1, 
            restitution: 1.0, 
            contactEquationStiffness: 1e9, 
            contactEquationRelaxation: 2
            }
        );
        this.world.addContactMaterial(playerPlayerContact);
    }
    createGroundBody() {
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({ 
            mass: 0, 
            material: this.groundMaterial 
        });
        this.groundBody.addShape(groundShape);
        this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.add(this.groundBody);
    }
    createFieldBounds() {
        console.log('🌍 Terrain ouvert créé - pas de limites physiques');
        this.createGoalPosts();
    }
    createGoalPosts() {
        const postRadius = 0.2;
        const postHeight = 4;
        const goalWidth = 6;
        const goalPositions = [25, -25]; 
        goalPositions.forEach(goalZ => {
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
        this.ballBody.linearDamping = 0.99; 
        this.ballBody.angularDamping = 0.95; 
        this.world.add(this.ballBody);
        return this.ballBody;
    }
    createPlayerBody(playerId, position, team) {
        const playerRadius = 0.8;
        const playerHeight = 2;
        const playerShape = new CANNON.Cylinder(playerRadius, playerRadius, playerHeight, 8);
        const playerBody = new CANNON.Body({ 
            mass: 80, 
            material: this.playerMaterial 
        });
        playerBody.addShape(playerShape);
        playerBody.position.set(position.x, position.y, position.z);
        playerBody.fixedRotation = true;
        playerBody.updateMassProperties();
        playerBody.linearDamping = 1; 
        playerBody.angularDamping = 1; 
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
        const moveForce = 3000; 
        const force = new CANNON.Vec3(0, 0, 0);
        if (movement.forward) force.z -= moveForce;
        if (movement.backward) force.z += moveForce;
        if (movement.left) force.x -= moveForce;
        if (movement.right) force.x += moveForce;
        body.applyForce(force, body.position);
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
        const punchRange = 2.5;
        if (this.ballBody) {
            const ballDistance = playerPos.distanceTo(this.ballBody.position);
            if (ballDistance <= punchRange) {
                const pushDirection = direction.clone();
                pushDirection.y = 0.2; 
                this.ballBody.applyImpulse(pushDirection.scale(force * 0.3), this.ballBody.position);
            }
        }
        this.playerBodies.forEach((targetBody, targetId) => {
            if (targetId === playerId) return;
            const distance = playerPos.distanceTo(targetBody.position);
            if (distance <= punchRange) {
                const punchDirection = direction.clone();
                punchDirection.y = 0.1; 
                targetBody.applyImpulse(punchDirection.scale(force), targetBody.position);
                const recoilDirection = direction.clone().negate();
                playerBody.applyImpulse(recoilDirection.scale(force * 0.2), playerBody.position);
                return { targetId, hit: true };
            }
        });
    }
    kickBall(playerId, direction, force = 1000) { 
        const playerBody = this.playerBodies.get(playerId);
        if (!playerBody || !this.ballBody) return;
        const playerPos = playerBody.position;
        const ballPos = this.ballBody.position;
        const distance = playerPos.distanceTo(ballPos);
        const kickRange = 1.5; 
        if (distance <= kickRange) {
            const kickDirection = new CANNON.Vec3(direction.x, 0.01, direction.z); 
            kickDirection.normalize();
            this.ballBody.applyImpulse(kickDirection.scale(force), ballPos);
            return true;
        }
        return false;
    }
    checkGoal(ballPosition) {
        const goalLine = 14.5; 
        const goalWidth = 3; 
        const goalHeight = 4;
        if (ballPosition.z > goalLine && 
            Math.abs(ballPosition.x) < goalWidth && 
            ballPosition.y < goalHeight) {
            return 'blue'; 
        }
        if (ballPosition.z < -goalLine && 
            Math.abs(ballPosition.x) < goalWidth && 
            ballPosition.y < goalHeight) {
            return 'red'; 
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
        this.world.step(deltaTime);
        this.playerBodies.forEach(body => {
            if (body.position.y < 1) {
                body.position.y = 1;
                body.velocity.y = Math.max(0, body.velocity.y);
            }
            body.quaternion.set(0, 0, 0, 1);
        });
        if (this.ballBody) {
            if (this.ballBody.position.y > 0.505) {
                this.ballBody.position.y = 0.505; 
            }
            if (this.ballBody.velocity.y > 0.01) {
                this.ballBody.velocity.y = 0; 
            }
            if (this.ballBody.velocity.y > 0) {
                this.ballBody.velocity.y *= 0.01; 
            }
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
const physicsManager = new PhysicsManager();