let scene, camera, renderer, player;
let obstacles = [], score = 0, gameOver = false;
const ui = document.getElementById("ui");
const titleScreen = document.getElementById("titleScreen");
const startBtn = document.getElementById("startBtn");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScore = document.getElementById("finalScore");

let moveLeft=false, moveRight=false;
let velocityY=0, gravity=-0.01, jumpForce=0.35;
let isGrounded=true, isSliding=false, slideTimer=0, slideDuration=30;

// Start / Restart
startBtn.onclick = () => { titleScreen.style.display="none"; initGame(); animate(); }
document.getElementById("restartBtn").onclick = () => { gameOverScreen.style.display="none"; resetGame(); animate(); };

// Input
window.addEventListener("keydown", (e)=>{
  if(e.key==="ArrowLeft") moveLeft=true;
  if(e.key==="ArrowRight") moveRight=true;
  if(e.code==="Space" && isGrounded && !isSliding){ velocityY=jumpForce; isGrounded=false; }
  if(e.key==="Shift" && isGrounded && !isSliding){ isSliding=true; slideTimer=slideDuration; player.scale.y=0.5; player.position.y=0.25; }
});
window.addEventListener("keyup",(e)=>{ if(e.key==="ArrowLeft") moveLeft=false; if(e.key==="ArrowRight") moveRight=false; });

function initGame(){
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight,0.1,1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Player
  const geometry = new THREE.BoxGeometry(1,1,1);
  const material = new THREE.MeshBasicMaterial({ color:0x00ff00 });
  player = new THREE.Mesh(geometry, material);
  player.position.set(0,0.5,5);
  scene.add(player);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(20,200);
  const groundMat = new THREE.MeshBasicMaterial({color:0x444444, side:THREE.DoubleSide});
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = Math.PI/2;
  scene.add(ground);

  camera.position.set(0,5,10);
  camera.lookAt(0,0,0);
}

function spawnObstacle(){
  const type=Math.floor(Math.random()*3);
  let geo, mat;
  if(type===0){geo=new THREE.BoxGeometry(1,1,1); mat=new THREE.MeshBasicMaterial({color:0xff0000});}
  else if(type===1){geo=new THREE.BoxGeometry(1,2,1); mat=new THREE.MeshBasicMaterial({color:0x0000ff});}
  else{geo=new THREE.BoxGeometry(1,0.5,1); mat=new THREE.MeshBasicMaterial({color:0xffff00});}
  const obs=new THREE.Mesh(geo, mat);
  obs.position.set(Math.floor(Math.random()*3)-1, geo.parameters.height/2, -50);
  obs.userData.type=type;
  scene.add(obs);
  obstacles.push(obs);
}

function animate(){
  if(gameOver) return;
  requestAnimationFrame(animate);
  score++;

  // Player movement
  if(moveLeft && player.position.x>-2) player.position.x-=0.1;
  if(moveRight && player.position.x<2) player.position.x+=0.1;

  // Jump
  velocityY+=gravity;
  player.position.y+=velocityY;
  if(player.position.y<=(isSliding?0.25:0.5)){player.position.y=isSliding?0.25:0.5; velocityY=0; isGrounded=true;}

  // Slide
  if(isSliding){ slideTimer--; if(slideTimer<=0){ isSliding=false; player.scale.y=1; player.position.y=0.5; } }

  // Obstacles
  if(Math.random()<0.02) spawnObstacle();
  obstacles.forEach((obs,i)=>{
    obs.position.z+=0.3;
    if(obs.position.z>10){scene.remove(obs); obstacles.splice(i,1);}
    if(Math.abs(player.position.x-obs.position.x)<0.9 && Math.abs(player.position.z-obs.position.z)<0.9){
      if(obs.userData.type===0 && player.position.y<=1.0){ endGame(); }
      else if(obs.userData.type===1 && !isSliding){ endGame(); }
      else if(obs.userData.type===2 && player.position.y<1.2){ endGame(); }
    }
  });

  renderer.render(scene,camera);
  ui.innerText="Score: "+score;
}

function endGame(){ gameOver=true; finalScore.innerText="Final Score: "+score; gameOverScreen.style.display="block"; }
function resetGame(){ obstacles.forEach(o=>scene.remove(o)); obstacles=[]; score=0; gameOver=false; player.position.set(0,0.5,5); player.scale.y=1; isSliding=false; velocityY=0; }
