// ---------------------------
// Mini 3D Shooter (Shell-Shockers style)
// ---------------------------
let scene, camera, renderer;
let player, playerSpeed = 0.2;
let bullets = [], enemies = [];
let health = 100, score = 0;
let gameOver = false;
let keys = {};
const uiHealth = document.getElementById("health");
const uiScore = document.getElementById("score");
const titleScreen = document.getElementById("titleScreen");
const startBtn = document.getElementById("startBtn");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScore = document.getElementById("finalScore");

// Input
keys = { w: false, a: false, s: false, d: false };
let mouse = { x: 0, y: 0 };

// Start & restart buttons
startBtn.onclick = () => { titleScreen.style.display = "none"; initGame(); animate(); }
document.getElementById("restartBtn").onclick = () => { gameOverScreen.style.display = "none"; resetGame(); animate(); }

// Movement events
window.addEventListener("keydown", (e) => { if(keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener("keyup", (e) => { if(keys.hasOwnProperty(e.key)) keys[e.key] = false; });

// Mouse aim
window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Shooting
window.addEventListener("click", () => { shootBullet(); });

// -------------------
// Initialization
// -------------------
function initGame() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 10);
  camera.lookAt(0,0,0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Light
  const light = new THREE.DirectionalLight(0xffffff,1);
  light.position.set(10,20,10);
  scene.add(light);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(50,50);
  const groundMat = new THREE.MeshStandardMaterial({ color:0x444444 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  // Player
  const geo = new THREE.CapsuleGeometry(0.5,1,4,8);
  const mat = new THREE.MeshStandardMaterial({ color:0x00ff00 });
  player = new THREE.Mesh(geo, mat);
  player.position.y = 1;
  scene.add(player);

  // Spawn initial enemies
  for(let i=0;i<5;i++) spawnEnemy();
}

// -------------------
// Player Shooting
// -------------------
function shootBullet() {
  const geo = new THREE.SphereGeometry(0.1,8,8);
  const mat = new THREE.MeshStandardMaterial({ color:0xff0000 });
  const bullet = new THREE.Mesh(geo, mat);

  // Start at player position
  bullet.position.copy(player.position);
  bullet.position.y = 1;

  // Direction
  const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
  vector.unproject(camera);
  const dir = vector.sub(camera.position).normalize();
  bullet.userData.dir = dir;

  bullets.push(bullet);
  scene.add(bullet);
}

// -------------------
// Spawn Enemy
// -------------------
function spawnEnemy() {
  const geo = new THREE.CapsuleGeometry(0.5,1,4,8);
  const mat = new THREE.MeshStandardMaterial({ color:0xff8800 });
  const enemy = new THREE.Mesh(geo, mat);
  enemy.position.set((Math.random()-0.5)*20,1,(Math.random()-0.5)*20);
  scene.add(enemy);
  enemies.push(enemy);
}

// -------------------
// Animate Loop
// -------------------
function animate() {
  if(gameOver) return;
  requestAnimationFrame(animate);

  // Player movement
  if(keys.w) player.position.z -= playerSpeed;
  if(keys.s) player.position.z += playerSpeed;
  if(keys.a) player.position.x -= playerSpeed;
  if(keys.d) player.position.x += playerSpeed;

  // Rotate player toward mouse
  const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
  const dir = vector.sub(camera.position).normalize();
  const angle = Math.atan2(dir.x, dir.z);
  player.rotation.y = angle;

  // Move bullets
  for(let i=bullets.length-1;i>=0;i--) {
    bullets[i].position.add(bullets[i].userData.dir.clone().multiplyScalar(0.5));
    // Remove bullets out of arena
    if(bullets[i].position.length() > 50) {
      scene.remove(bullets[i]);
      bullets.splice(i,1);
    } else {
      // Check collision with enemies
      const bulletBox = new THREE.Box3().setFromObject(bullets[i]);
      for(let j=enemies.length-1;j>=0;j--) {
        const enemyBox = new THREE.Box3().setFromObject(enemies[j]);
        if(bulletBox.intersectsBox(enemyBox)) {
          scene.remove(enemies[j]);
          enemies.splice(j,1);
          scene.remove(bullets[i]);
          bullets.splice(i,1);
          score += 10;
          spawnEnemy();
          break;
        }
      }
    }
  }

  // Move enemies toward player
  enemies.forEach(e => {
    const dir = new THREE.Vector3().subVectors(player.position,e.position).normalize();
    e.position.add(dir.multiplyScalar(0.05));
    // Enemy collision with player
    const enemyBox = new THREE.Box3().setFromObject(e);
    const playerBox = new THREE.Box3().setFromObject(player);
    if(playerBox.intersectsBox(enemyBox)) {
      health -= 0.5;
      if(health <= 0) endGame();
    }
  });

  // Update UI
  uiHealth.innerText = "Health: " + Math.floor(health);
  uiScore.innerText = "Score: " + score;

  // Camera follow player
  camera.position.x += (player.position.x - camera.position.x) * 0.1;
  camera.position.z += (player.position.z + 10 - camera.position.z) * 0.1;
  camera.lookAt(player.position);

  renderer.render(scene, camera);
}

// -------------------
// End & Reset Game
// -------------------
function endGame() {
  gameOver = true;
  finalScore.innerText = "Final Score: " + score;
  gameOverScreen.style.display = "block";
}

function resetGame() {
  bullets.forEach(b=>scene.remove(b));
  enemies.forEach(e=>scene.remove(e));
  bullets = [];
  enemies = [];
  score = 0;
  health = 100;
  gameOver = false;
  player.position.set(0,1,0);
  spawnEnemy();
}
