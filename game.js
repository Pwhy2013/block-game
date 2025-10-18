// ----------------------------
// First-Person Shooter Hard Mode & Drones
// ----------------------------
let scene, camera, renderer;
let yawObject; 
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
let enemySpawnTimer = 0;
let gameTime = 0; // counts frames for scaling

const uiHealth = document.getElementById("health");
const uiScore = document.getElementById("score");
const titleScreen = document.getElementById("titleScreen");
const startBtn = document.getElementById("startBtn");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScore = document.getElementById("finalScore");

startBtn.onclick = () => { titleScreen.style.display = "none"; initGame(); animate(); };
document.getElementById("restartBtn").onclick = () => { gameOverScreen.style.display = "none"; resetGame(); animate(); };

document.body.addEventListener('click', () => { renderer.domElement.requestPointerLock(); });
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        mouseMovement.x = e.movementX * 0.002;
        mouseMovement.y = e.movementY * 0.002;
    }
});

window.addEventListener("keydown", (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener("keyup", (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

function initGame() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x666666);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

    yawObject = new THREE.Object3D();
    yawObject.position.set(0, player.height, 5);
    yawObject.add(camera);
    scene.add(yawObject);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(50,50),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1 })
    );
    ground.rotation.x = -Math.PI/2;
    scene.add(ground);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1 });
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(50,5,1), wallMat); wall1.position.set(0,2.5,-25); scene.add(wall1); walls.push(wall1);
    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(50,5,1), wallMat); wall2.position.set(0,2.5,25); scene.add(wall2); walls.push(wall2);
    const wall3 = new THREE.Mesh(new THREE.BoxGeometry(1,5,50), wallMat); wall3.position.set(-25,2.5,0); scene.add(wall3); walls.push(wall3);
    const wall4 = new THREE.Mesh(new THREE.BoxGeometry(1,5,50), wallMat); wall4.position.set(25,2.5,0); scene.add(wall4); walls.push(wall4);

    const weapon = new THREE.Mesh(
        new THREE.BoxGeometry(0.1,0.1,0.5),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    weapon.position.set(0.2,-0.2,-0.5);
    camera.add(weapon);

    const cross = new THREE.Mesh(
        new THREE.RingGeometry(0.02,0.03,32),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    cross.position.set(0,0,-1);
    camera.add(cross);

    // Spawn more enemies at start for harder game
    for(let i=0;i<8;i++) spawnEnemy();
}

window.addEventListener('click', shootBullet);
function shootBullet() {
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8), new THREE.MeshStandardMaterial({color:0xff0000}));
    bullet.position.copy(camera.getWorldPosition(new THREE.Vector3()));
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    bullet.userData = { dir: dir.clone() };
    bullets.push(bullet);
    scene.add(bullet);
}

function spawnEnemy() {
    let pos, safe=false, attempts=0;
    while(!safe && attempts<50) {
        attempts++;
        pos = new THREE.Vector3((Math.random()-0.5)*40,0.5,(Math.random()-0.5)*40);
        const enemyBox = new THREE.Box3().setFromCenterAndSize(pos,new THREE.Vector3(1,2,1));
        const playerBox = new THREE.Box3().setFromCenterAndSize(yawObject.position,new THREE.Vector3(1,player.height,1));
        safe = !enemyBox.intersectsBox(playerBox);
        walls.forEach(w=>{ if(enemyBox.intersectsBox(new THREE.Box3().setFromObject(w))) safe=false; });
    }
    const enemy = new THREE.Mesh(new THREE.CapsuleGeometry(0.5,1,4,8), new THREE.MeshStandardMaterial({color:0xff8800}));
    enemy.position.copy(pos);
    enemies.push(enemy);
    scene.add(enemy);
}

function animate() {
    if(gameOver) return;
    requestAnimationFrame(animate);
    gameTime++; // scale difficulty

    // Mouse rotation
    yawObject.rotation.y -= mouseMovement.x;
    camera.rotation.x -= mouseMovement.y;
    camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
    mouseMovement.x=0; mouseMovement.y=0;

    updateDrones();
    checkDronePickup();
    updateDronePickups();

    if(dronePickupTimer<=0){ spawnDronePickup(); dronePickupTimer=900; } else dronePickupTimer--;

    // Enemy spawn over time
    enemySpawnTimer--;
    if(enemySpawnTimer<=0){
        spawnEnemy();
        enemySpawnTimer = 300; // every 5 seconds
    }

    // Player movement
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(yawObject.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(yawObject.quaternion);
    let moveDir = new THREE.Vector3();
    if(keys.w) moveDir.add(forward);
    if(keys.s) moveDir.sub(forward);
    if(keys.a) moveDir.sub(right);
    if(keys.d) moveDir.add(right);
    moveDir.y = 0;
    if(moveDir.length()>0) moveDir.normalize();
    movePlayer(moveDir);

    // Update bullets
    for(let i=bullets.length-1;i>=0;i--){
        bullets[i].position.add(bullets[i].userData.dir.clone().multiplyScalar(0.5));
        const bulletBox = new THREE.Box3().setFromObject(bullets[i]);

        if(bulletBox.intersectsBox(new THREE.Box3().setFromObject(walls[0]))||
           bulletBox.intersectsBox(new THREE.Box3().setFromObject(walls[1]))||
           bulletBox.intersectsBox(new THREE.Box3().setFromObject(walls[2]))||
           bulletBox.intersectsBox(new THREE.Box3().setFromObject(walls[3]))){
            scene.remove(bullets[i]); bullets.splice(i,1); continue;
        }

        for(let j=enemies.length-1;j>=0;j--){
            const enemyBox = new THREE.Box3().setFromObject(enemies[j]);
            if(bulletBox.intersectsBox(enemyBox)){
                scene.remove(enemies[j]); enemies.splice(j,1);
                scene.remove(bullets[i]); bullets.splice(i,1);
                score+=10; spawnEnemy(); break;
            }
        }
    }

    // Drone bullets
    for(let i=droneBullets.length-1;i>=0;i--){
        const b = droneBullets[i];
        b.position.add(b.userData.dir.clone().multiplyScalar(0.3));
        if(b.position.distanceTo(yawObject.position)>100){ scene.remove(b); droneBullets.splice(i,1); continue; }
        const bulletBox = new THREE.Box3().setFromObject(b);
        for(let j=enemies.length-1;j>=0;j--){
            const enemyBox = new THREE.Box3().setFromObject(enemies[j]);
            if(bulletBox.intersectsBox(enemyBox)){
                scene.remove(enemies[j]); enemies.splice(j,1);
                scene.remove(b); droneBullets.splice(i,1);
                score+=10; spawnEnemy(); break;
            }
        }
    }

    // Enemies move toward player
    const speedMultiplier = 1 + gameTime/3600; // scale difficulty over time
    enemies.forEach(e=>{
        const dir = new THREE.Vector3().subVectors(yawObject.position,e.position); dir.y=0; dir.normalize();
        // random jitter for dodging
        dir.x += (Math.random()-0.5)*0.1;
        dir.z += (Math.random()-0.5)*0.1;
        e.position.add(dir.multiplyScalar(0.08*speedMultiplier));

        const enemyBox = new THREE.Box3().setFromObject(e);
        const playerBox = new THREE.Box3().setFromCenterAndSize(yawObject.position,new THREE.Vector3(0.5,player.height,0.5));
        if(enemyBox.intersectsBox(playerBox)){
            player.health -= 0.5*speedMultiplier;
            if(player.health<=0) endGame();
        }
    });

    // UI
    uiHealth.innerText = "Health: "+Math.floor(player.health);
    uiScore.innerText = "Score: "+score;

    renderer.render(scene,camera);
}

// Reset & End
function endGame(){ gameOver=true; finalScore.innerText="Final Score: "+score; gameOverScreen.style.display="block"; }
function resetGame(){
    bullets.forEach(b=>scene.remove(b)); enemies.forEach(e=>scene.remove(e));
    droneBullets.forEach(b=>scene.remove(b)); drones.forEach(d=>scene.remove(d)); dronePickups.forEach(p=>scene.remove(p));
    bullets=[]; enemies=[]; droneBullets=[]; drones=[]; dronePickups=[];
    score=0; player.health=100; gameOver=false; gameTime=0;
    yawObject.position.set(0,player.height,5); camera.rotation.set(0,0,0); yawObject.rotation.set(0,0,0);
    for(let i=0;i<8;i++) spawnEnemy();
}

// Movement with collision
function movePlayer(moveDir){
    const nextPos = yawObject.position.clone().add(moveDir.multiplyScalar(player.speed));
    const playerBox = new THREE.Box3().setFromCenterAndSize(nextPos,new THREE.Vector3(1,1.6,1));
    let collision=false;
    walls.forEach(w=>{ if(playerBox.intersectsBox(new THREE.Box3().setFromObject(w))) collision=true; });
    if(!collision) yawObject.position.copy(nextPos);
}

// Drone functions (deploy, update, shoot) remain unchanged
// Drone pickups, hover animation, and laser shooting remain the same
// You can copy your existing drone-related functions here
