// ----------------------------
// First-Person Shooter Fixed
// ----------------------------
let scene, camera, renderer;
let yawObject; // handles horizontal rotation
let player = { height: 1.6, speed: 0.2, health: 100 };
let bullets = [], enemies = [];
let score = 0;
let gameOver = false;
let keys = { w: false, a: false, s: false, d: false };
let mouseMovement = { x: 0, y: 0 };

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
    yawObject.add(camera); // camera handles vertical rotation
    scene.add(yawObject);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1 });
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(50, 5, 1), wallMat); wall1.position.set(0, 2.5, -25); scene.add(wall1);
    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(50, 5, 1), wallMat); wall2.position.set(0, 2.5, 25); scene.add(wall2);
    const wall3 = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 50), wallMat); wall3.position.set(-25, 2.5, 0); scene.add(wall3);
    const wall4 = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 50), wallMat); wall4.position.set(25, 2.5, 0); scene.add(wall4);

    // Weapon mesh
    const weaponGeo = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const weaponMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const weapon = new THREE.Mesh(weaponGeo, weaponMat);
    weapon.position.set(0.2, -0.2, -0.5);
    camera.add(weapon);

    // Crosshair
    const crossGeo = new THREE.RingGeometry(0.02, 0.03, 32);
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cross = new THREE.Mesh(crossGeo, crossMat);
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
    const bulletGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    bullet.position.copy(camera.getWorldPosition(new THREE.Vector3()));
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    bullet.userData = { dir: dir };
    bullets.push(bullet);
    scene.add(bullet);
}

// ------------------
// Spawn enemy
// ------------------
function spawnEnemy() {
    const geo = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff8800 });
    const enemy = new THREE.Mesh(geo, mat);
    enemy.position.set((Math.random() - 0.5) * 40, 0.5, (Math.random() - 0.5) * 40);
    enemies.push(enemy);
    scene.add(enemy);
}

// ------------------
// Animate loop
// ------------------
function animate() {
    if (gameOver) return;
    requestAnimationFrame(animate);
// ----- Mouse rotation -----
yawObject.rotation.y -= mouseMovement.x;       // horizontal
camera.rotation.x -= mouseMovement.y;         // vertical corrected (subtract instead of add)
camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
mouseMovement.x = 0;
mouseMovement.y = 0;


    // ----- Movement -----
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yawObject.quaternion);
    const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(yawObject.quaternion);
    let moveDir = new THREE.Vector3();
    if (keys.w) moveDir.add(forward);
    if (keys.s) moveDir.sub(forward);
    if (keys.a) moveDir.sub(right);
    if (keys.d) moveDir.add(right);
    moveDir.y = 0;
    if (moveDir.length() > 0) moveDir.normalize();
    yawObject.position.add(moveDir.multiplyScalar(player.speed));

    // ----- Bullets update -----
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].position.add(bullets[i].userData.dir.clone().multiplyScalar(0.5));
        if (bullets[i].position.length() > 100) { scene.remove(bullets[i]); bullets.splice(i, 1); continue; }

        const bulletBox = new THREE.Box3().setFromObject(bullets[i]);
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemyBox = new THREE.Box3().setFromObject(enemies[j]);
            if (bulletBox.intersectsBox(enemyBox)) {
                scene.remove(enemies[j]);
                enemies.splice(j, 1);
                scene.remove(bullets[i]);
                bullets.splice(i, 1);
                score += 10;
                spawnEnemy();
                break;
            }
        }
    }

    // ----- Enemies move toward player -----
    enemies.forEach(e => {
        const dir = new THREE.Vector3().subVectors(yawObject.position, e.position);
        dir.y = 0;
        dir.normalize();
        e.position.add(dir.multiplyScalar(0.05));

        const enemyBox = new THREE.Box3().setFromObject(e);
        const playerBox = new THREE.Box3().setFromCenterAndSize(yawObject.position, new THREE.Vector3(0.5, player.height, 0.5));
        if (enemyBox.intersectsBox(playerBox)) {
            player.health -= 0.3;
            if (player.health <= 0) endGame();
        }
    });

    // ----- UI -----
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
    bullets = []; enemies = [];
    score = 0; player.health = 100; gameOver = false;
    yawObject.position.set(0, player.height, 5);
    camera.rotation.set(0, 0, 0);
    spawnEnemy();
}

function shootBullet() {
  const bulletGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const bulletMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const bullet = new THREE.Mesh(bulletGeo, bulletMat);
  
  bullet.position.copy(camera.getWorldPosition(new THREE.Vector3()));
  
  // Use world direction
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  
  bullet.userData = { dir: dir.clone() };
  bullets.push(bullet);
  scene.add(bullet);
}
