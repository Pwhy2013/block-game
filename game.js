// ----------------------------
// First-Person Shooter Fixed & Drones
// ----------------------------
let scene, camera, renderer;
let yawObject; // handles horizontal rotation
let player = { height: 1.6, speed: 0.2, health: 100 };
let bullets = [], enemies = [];
let droneBullets = [], drones = [], dronePickups = [];
let score = 0;
let gameOver = false;
let keys = { w: false, a: false, s: false, d: false };
let mouseMovement = { x: 0, y: 0 };
let walls = [];

const droneLimit = 3;
let dronePickupTimer = 0;

const uiHealth = document.getElementById("health");
const uiScore = document.getElementById("score");
const titleScreen = document.getElementById("titleScreen");
const startBtn = document.getElementById("startBtn");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScore = document.getElementById("finalScore");

// ------------------
// Start & Restart
// ------------------
startBtn.onclick = () => { titleScreen.style.display = "none"; initGame(); animate(); };
document.getElementById("restartBtn").onclick = () => { gameOverScreen.style.display = "none"; resetGame(); animate(); };

// ------------------
// Pointer Lock
// ------------------
document.body.addEventListener('click', () => { renderer.domElement.requestPointerLock(); });
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        mouseMovement.x = e.movementX * 0.002;
        mouseMovement.y = e.movementY * 0.002;
    }
});

// ------------------
// Keyboard input
// ------------------
window.addEventListener("keydown", (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener("keyup", (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

// ------------------
// Initialize Game
// ------------------
function initGame() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x666666);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // ----- yawObject handles horizontal rotation -----
    yawObject = new THREE.Object3D();
    yawObject.position.set(0, player.height, 5);
    yawObject.add(camera);
    scene.add(yawObject);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1 });

    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(50, 5, 1), wallMat); wall1.position.set(0, 2.5, -25); scene.add(wall1); walls.push(wall1);
    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(50, 5, 1), wallMat); wall2.position.set(0, 2.5, 25); scene.add(wall2); walls.push(wall2);
    const wall3 = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 50), wallMat); wall3.position.set(-25, 2.5, 0); scene.add(wall3); walls.push(wall3);
    const wall4 = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 50), wallMat); wall4.position.set(25, 2.5, 0); scene.add(wall4); walls.push(wall4);

    // Weapon
    const weapon = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    weapon.position.set(0.2, -0.2, -0.5);
    camera.add(weapon);

    // Crosshair
    const cross = new THREE.Mesh(
        new THREE.RingGeometry(0.02, 0.03, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    cross.position.set(0, 0, -1);
    camera.add(cross);

    // Spawn initial enemies
    for (let i = 0; i < 5; i++) spawnEnemy();
}

// ------------------
// Shooting bullets
// ------------------
window.addEventListener('click', shootBullet);
function shootBullet() {
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    bullet.position.copy(camera.getWorldPosition(new THREE.Vector3()));
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    bullet.userData = { dir: dir.clone() };
    bullets.push(bullet);
    scene.add(bullet);
}

// ------------------
// Spawn enemy
// ------------------
function spawnEnemy() {
    let pos, safe = false;
    while (!safe) {
        pos = new THREE.Vector3((Math.random() - 0.5) * 40, 0.5, (Math.random() - 0.5) * 40);
        const enemyBox = new THREE.Box3().setFromCenterAndSize(pos, new THREE.Vector3(1, 2, 1));
        const playerBox = new THREE.Box3().setFromCenterAndSize(yawObject.position, new THREE.Vector3(1, player.height, 1));
        safe = !enemyBox.intersectsBox(playerBox);
        walls.forEach(w => { if (enemyBox.intersectsBox(new THREE.Box3().setFromObject(w))) safe = false; });
    }
    const enemy = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 4, 8), new THREE.MeshStandardMaterial({ color: 0xff8800 }));
    enemy.position.copy(pos);
    enemies.push(enemy);
    scene.add(enemy);
}

// ------------------
// Animate loop
// ------------------
function animate() {
    if (gameOver) return;
    requestAnimationFrame(animate);

    // Mouse rotation
    yawObject.rotation.y -= mouseMovement.x;
    camera.rotation.x -= mouseMovement.y;
    camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
    mouseMovement.x = 0; mouseMovement.y = 0;

    // Drones
    updateDrones();
    checkDronePickup();
    updateDronePickups();
   
    if (dronePickupTimer <= 0) { spawnDronePickup(); dronePickupTimer = 600; } else dronePickupTimer--;

    // Movement
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yawObject.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yawObject.quaternion);
    let moveDir = new THREE.Vector3();
    if (keys.w) moveDir.add(forward);
    if (keys.s) moveDir.sub(forward);
    if (keys.a) moveDir.sub(right);
    if (keys.d) moveDir.add(right);
    moveDir.y = 0;
    if (moveDir.length() > 0) moveDir.normalize();
    movePlayer(moveDir);

    // Bullets update
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].position.add(bullets[i].userData.dir.clone().multiplyScalar(0.5));
        if (bullets[i].position.length() > 100) { scene.remove(bullets[i]); bullets.splice(i, 1); continue; }
        const bulletBox = new THREE.Box3().setFromObject(bullets[i]);
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemyBox = new THREE.Box3().setFromObject(enemies[j]);
            if (bulletBox.intersectsBox(enemyBox)) {
                scene.remove(enemies[j]); enemies.splice(j, 1);
                scene.remove(bullets[i]); bullets.splice(i, 1);
                score += 10; spawnEnemy(); break;
            }
        }
    }

    // Drone bullets
    for (let i = droneBullets.length - 1; i >= 0; i--) {
        const b = droneBullets[i];
        b.position.add(b.userData.dir.clone().multiplyScalar(0.3));
        if (b.position.distanceTo(yawObject.position) > 100) { scene.remove(b); droneBullets.splice(i, 1); continue; }
        const bulletBox = new THREE.Box3().setFromObject(b);
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemyBox = new THREE.Box3().setFromObject(enemies[j]);
            if (bulletBox.intersectsBox(enemyBox)) {
                scene.remove(enemies[j]); enemies.splice(j, 1);
                scene.remove(b); droneBullets.splice(i, 1);
                score += 10; spawnEnemy(); break;
            }
        }
    }

    // Enemies move toward player
    enemies.forEach(e => {
        const dir = new THREE.Vector3().subVectors(yawObject.position, e.position);
        dir.y = 0; dir.normalize(); e.position.add(dir.multiplyScalar(0.05));
        const enemyBox = new THREE.Box3().setFromObject(e);
        const playerBox = new THREE.Box3().setFromCenterAndSize(yawObject.position, new THREE.Vector3(0.5, player.height, 0.5));
        if (enemyBox.intersectsBox(playerBox)) { player.health -= 0.3; if (player.health <= 0) endGame(); }
    });

    // UI
    uiHealth.innerText = "Health: " + Math.floor(player.health);
    uiScore.innerText = "Score: " + score;

    renderer.render(scene, camera);
}

// ------------------
// End & Reset
// ------------------
function endGame() {
    gameOver = true;
    finalScore.innerText = "Final Score: " + score;
    gameOverScreen.style.display = "block";
}

function resetGame() {
    bullets.forEach(b => scene.remove(b));
    enemies.forEach(e => scene.remove(e));
    droneBullets.forEach(b => scene.remove(b));
    drones.forEach(d => scene.remove(d));
    dronePickups.forEach(p => scene.remove(p));
    bullets = []; enemies = []; droneBullets = []; drones = []; dronePickups = [];
    score = 0; player.health = 100; gameOver = false;
    yawObject.position.set(0, player.height, 5);
    camera.rotation.set(0, 0, 0);
    spawnEnemy();
}

// ------------------
// Player movement with collision
// ------------------
function movePlayer(moveDir) {
    const nextPos = yawObject.position.clone().add(moveDir.multiplyScalar(player.speed));
    const playerBox = new THREE.Box3().setFromCenterAndSize(nextPos, new THREE.Vector3(1, 1.6, 1));
    let collision = false;
    walls.forEach(w => { if (playerBox.intersectsBox(new THREE.Box3().setFromObject(w))) collision = true; });
    if (!collision) yawObject.position.copy(nextPos);
}

// ------------------
// Deploy a blob-style drone
// ------------------
function deployDrone() {
    if (drones.length >= droneLimit) return;

    const drone = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x00ffff })
    );

    // Position slightly above player
    drone.position.copy(yawObject.position).add(new THREE.Vector3(0, 1, 0));

    drone.userData = {
        cooldown: 0,
        offsetAngle: Math.random() * Math.PI * 2, // for orbiting
        distance: 1.5
    };

    drones.push(drone);
    scene.add(drone);
}

// ------------------
// Update blob-style drones
// ------------------
function updateDrones() {
    const time = Date.now() * 0.002;

    drones.forEach(drone => {
        // Orbit player
        const x = Math.cos(drone.userData.offsetAngle + time) * drone.userData.distance;
        const z = Math.sin(drone.userData.offsetAngle + time) * drone.userData.distance;
        drone.position.x = yawObject.position.x + x;
        drone.position.z = yawObject.position.z + z;
        drone.position.y = yawObject.position.y + 1;

        // Find nearest enemy
        let closest = null, minDist = Infinity;
        enemies.forEach(e => {
            const d = drone.position.distanceTo(e.position);
            if (d < minDist) { minDist = d; closest = e; }
        });

        if (closest) {
            if (drone.userData.type === "laser") {
                // Shoot laser if cooldown finished
                if (drone.userData.cooldown <= 0) {
                    shootLaserDrone(drone, closest);
                    drone.userData.cooldown = 60; // frames before next laser
                } else drone.userData.cooldown--;
            } else {
                // Normal drones
                if (minDist < 20 && drone.userData.cooldown <= 0) {
                    shootDroneBullet(drone, closest);
                    drone.userData.cooldown = 15;
                } else drone.userData.cooldown--;
            }
        }
    });
}

function deployLaserDrone() {
    if (drones.length >= droneLimit) return;

    const laserDrone = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.5 })
    );

    laserDrone.position.copy(yawObject.position).add(new THREE.Vector3(0, 1, 0));

    laserDrone.userData = {
        type: "laser",
        cooldown: 0,
        offsetAngle: Math.random() * Math.PI * 2,
        distance: 2
    };

    drones.push(laserDrone);
    scene.add(laserDrone);
}


function shootDroneBullet(drone, target) {
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
    bullet.position.copy(drone.position);
    bullet.userData = { dir: new THREE.Vector3().subVectors(target.position, drone.position).normalize() };
    droneBullets.push(bullet); scene.add(bullet);
}

// ------------------
// Spawn drone pickup
// ------------------
function spawnDronePickup() {
    let pos, safe = false;
    let attempts = 0;
    while (!safe && attempts < 50) {
        attempts++;
        pos = new THREE.Vector3(
            (Math.random() - 0.5) * 40,
            0.5, // start a bit higher
            (Math.random() - 0.5) * 40
        );

        const pickupBox = new THREE.Box3().setFromCenterAndSize(pos, new THREE.Vector3(0.5, 0.5, 0.5));
        safe = true;

        walls.forEach(w => {
            if (pickupBox.intersectsBox(new THREE.Box3().setFromObject(w))) safe = false;
        });

        const playerBox = new THREE.Box3().setFromCenterAndSize(yawObject.position, new THREE.Vector3(1, player.height, 1));
        if (pickupBox.intersectsBox(playerBox)) safe = false;
    }

    const geo = new THREE.SphereGeometry(0.25, 16, 16); // make it spherical like a Blob drone
    const mat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.5,
        roughness: 0.5,
        metalness: 0.3
    });

    const pickup = new THREE.Mesh(geo, mat);
    pickup.position.copy(pos);
    pickup.userData = { baseY: pos.y }; // store base height for floating animation

    dronePickups.push(pickup);
    scene.add(pickup);
}

// ------------------
// Update drone pickups (hovering + spinning)
// ------------------
function updateDronePickups() {
    const time = Date.now() * 0.002;
    dronePickups.forEach(pickup => {
        // Floating effect
        pickup.position.y = pickup.userData.baseY + Math.sin(time) * 0.25;

        // Rotate slowly
        pickup.rotation.y += 0.05;
        pickup.rotation.x += 0.02;
    });
}

// ------------------
// Check pickup (XZ-plane distance)
// ------------------
function checkDronePickup() {
    for (let i = dronePickups.length - 1; i >= 0; i--) {
        const pickup = dronePickups[i];
        const dx = yawObject.position.x - pickup.position.x;
        const dz = yawObject.position.z - pickup.position.z;
        const distXZ = Math.sqrt(dx*dx + dz*dz);
        if (distXZ < 1) {
            // 50% chance for laser drone, 50% normal drone
            if (Math.random() < 0.5) {
                deployDrone();
            } else {
                deployLaserDrone();
            }
            scene.remove(pickup);
            dronePickups.splice(i, 1);
        }
    }
}

function shootLaserDrone(drone, target) {
    // Create a thin red laser beam
    const distance = drone.position.distanceTo(target.position);
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, distance, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const laser = new THREE.Mesh(geometry, material);

    // Position laser between drone and target
    const mid = new THREE.Vector3().addVectors(drone.position, target.position).multiplyScalar(0.5);
    laser.position.copy(mid);

    // Orient laser toward target
    laser.lookAt(target.position);
    laser.rotateX(Math.PI / 2);

    scene.add(laser);

    // Instantly damage target
    scene.remove(target);
    enemies.splice(enemies.indexOf(target), 1);
    score += 15;
    spawnEnemy();

    // Remove laser after short duration
    setTimeout(() => { scene.remove(laser); }, 100);
}
