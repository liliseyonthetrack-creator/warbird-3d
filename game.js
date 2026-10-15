import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ad3ff);
scene.fog = new THREE.Fog(0x9ad3ff, 30, 150);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 4.5, 24);

scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x2d4d5d, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.25);
sun.position.set(20, 30, 18);
scene.add(sun);

const clouds = [];
for (let i = 0; i < 18; i += 1) {
  const cloud = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  const puffGeo = new THREE.SphereGeometry(1.5, 16, 16);
  for (let j = 0; j < 5; j += 1) {
    const puff = new THREE.Mesh(puffGeo, material);
    puff.position.set((j - 2) * 1.5, Math.random() * 1.5, Math.random() * 2 - 1);
    cloud.add(puff);
  }
  cloud.position.set((Math.random() - 0.5) * 38, 10 + Math.random() * 8, -Math.random() * 120);
  scene.add(cloud);
  clouds.push(cloud);
}

const hillMaterial = new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 1 });
for (let i = 0; i < 20; i += 1) {
  const hill = new THREE.Mesh(new THREE.ConeGeometry(8 + Math.random() * 5, 16 + Math.random() * 8, 24), hillMaterial);
  hill.position.set((i - 9.5) * 7, -4.5, -20 - i * 8);
  hill.rotation.z = Math.random() * 0.7;
  scene.add(hill);
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 220),
  new THREE.MeshStandardMaterial({ color: 0x4d7f47, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -8;
scene.add(ground);

const hud = {
  health: document.getElementById('health'),
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  startOverlay: document.getElementById('startOverlay'),
  gameOverOverlay: document.getElementById('gameOverOverlay'),
  finalScore: document.getElementById('finalScore')
};

const state = {
  started: false,
  gameOver: false,
  score: 0,
  best: Number(localStorage.getItem('warbird-best') || 0),
  health: 100,
  fireCooldown: 0,
  enemyTimer: 0,
  time: 0,
  worldSpeed: 18
};

const keys = {};
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Space') event.preventDefault();
});
window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
window.addEventListener('pointerdown', () => {
  if (!state.started) startGame();
  if (state.gameOver) startGame();
});

function startGame() {
  state.started = true;
  state.gameOver = false;
  state.score = 0;
  state.health = 100;
  state.fireCooldown = 0;
  state.enemyTimer = 0.8;
  state.time = 0;
  state.worldSpeed = 18;

  player.position.set(0, 0, 12);
  player.rotation.set(0, 0, 0);

  enemies.forEach((enemy) => scene.remove(enemy.mesh));
  bullets.forEach((bullet) => scene.remove(bullet.mesh));
  particles.forEach((particle) => scene.remove(particle));
  enemies.length = 0;
  bullets.length = 0;
  particles.length = 0;

  hud.startOverlay.classList.add('hidden');
  hud.gameOverOverlay.classList.add('hidden');
  updateHud();
}

function buildPlayer() {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.5, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 0.7, roughness: 0.7 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x1f6feb, metalness: 0.2, roughness: 0.6 });

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 3.5, 4, 12), body);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.scale.set(1.2, 1, 1);
  group.add(fuselage);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 18), accent);
  cockpit.position.set(0.8, 0.6, 0.1);
  cockpit.scale.set(1.3, 0.9, 1.2);
  group.add(cockpit);

  const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 5.2), dark);
  wingLeft.position.set(-1.7, -0.1, 0);
  wingLeft.rotation.z = 0.28;
  group.add(wingLeft);

  const wingRight = wingLeft.clone();
  wingRight.position.x = 1.7;
  wingRight.rotation.z = -0.28;
  group.add(wingRight);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.8), dark);
  tail.position.set(0, 0.7, -2.7);
  group.add(tail);

  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 1.2, 16), accent);
  engine.rotation.z = Math.PI / 2;
  engine.position.set(0, -0.5, 2.2);
  group.add(engine);

  const blaster = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1.7), new THREE.MeshStandardMaterial({ color: 0xffcc00 }));
  blaster.position.set(0, -0.15, 2.8);
  group.add(blaster);

  return group;
}

const player = buildPlayer();
player.position.set(0, 0, 12);
scene.add(player);

const enemies = [];
const bullets = [];
const particles = [];

function buildEnemy() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf94144, metalness: 0.35, roughness: 0.7 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x151d2a, metalness: 0.5, roughness: 0.7 });

  const core = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 2.1), bodyMat);
  group.add(core);

  const left = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 4.4), wingMat);
  left.position.set(-1.5, 0, 0);
  left.rotation.z = 0.35;
  group.add(left);

  const right = left.clone();
  right.position.x = 1.5;
  right.rotation.z = -0.35;
  group.add(right);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.5), wingMat);
  tail.position.set(0, 0.9, -2.2);
  group.add(tail);

  const enemy = {
    mesh: group,
    speed: 8 + Math.random() * 8,
    drift: (Math.random() - 0.5) * 2,
    phase: Math.random() * Math.PI * 2,
    hp: 1
  };

  enemy.mesh.position.set((Math.random() - 0.5) * 16, Math.random() * 8 - 2, -40 - Math.random() * 90);
  scene.add(enemy.mesh);
  enemies.push(enemy);
}

function spawnBullet() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xfff5a8,
    emissive: 0xffb703,
    emissiveIntensity: 1.8
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), material);
  mesh.position.copy(player.position);
  mesh.position.z += 3;
  scene.add(mesh);
  bullets.push({ mesh, velocity: new THREE.Vector3(0, 0, 34) });
}

function spawnImpact(position, color = 0xff7b00) {
  for (let i = 0; i < 12; i += 1) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.2
      })
    );
    particle.position.copy(position);
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    );
    scene.add(particle);
    particles.push(particle);
  }
}

function updateHud() {
  hud.health.textContent = Math.max(0, Math.round(state.health));
  hud.score.textContent = state.score;
  hud.best.textContent = state.best;
}

function endGame() {
  state.gameOver = true;
  state.started = false;
  state.best = Math.max(state.best, state.score);
  localStorage.setItem('warbird-best', String(state.best));
  hud.best.textContent = state.best;
  hud.finalScore.textContent = `Score: ${state.score}`;
  hud.gameOverOverlay.classList.remove('hidden');
}

function checkGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads[0];
  if (!pad) return { x: 0, y: 0, fire: false, boost: false };

  const x = pad.axes[0] || 0;
  const y = pad.axes[1] || 0;
  const fire = !!(pad.buttons[7]?.pressed || pad.buttons[0]?.pressed || pad.buttons[6]?.pressed);
  const boost = !!(pad.buttons[1]?.pressed || pad.buttons[5]?.pressed);
  return { x, y, fire, boost };
}

function updatePlayer(dt) {
  const pad = checkGamepad();
  let x = 0;
  let y = 0;

  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  if (keys.KeyW || keys.ArrowUp) y += 1;
  if (keys.KeyS || keys.ArrowDown) y -= 1;

  x += pad.x;
  y -= pad.y;

  const boost = keys.Shift || pad.boost;
  const speed = boost ? 18 : 10;
  player.position.x += x * speed * dt;
  player.position.y += y * speed * dt;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -12, 12);
  player.position.y = THREE.MathUtils.clamp(player.position.y, -3.5, 9.5);

  player.rotation.x = THREE.MathUtils.lerp(player.rotation.x, -y * 0.5, 0.1);
  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -x * 0.5, 0.1);
  player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, x * 0.28, 0.12);

  const firing = keys.Space || pad.fire;
  if (firing && state.fireCooldown <= 0) {
    spawnBullet();
    state.fireCooldown = 0.18;
  }
  state.fireCooldown = Math.max(0, state.fireCooldown - dt);
}

function updateEnemies(dt) {
  state.enemyTimer -= dt;
  if (state.enemyTimer <= 0) {
    buildEnemy();
    state.enemyTimer = Math.max(0.55, 1.2 - state.score / 300);
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.mesh.position.z += (enemy.speed + state.worldSpeed * 0.45) * dt;
    enemy.mesh.position.x += Math.sin(state.time * 2 + enemy.phase) * 1.2 * dt;
    enemy.mesh.position.y += Math.cos(state.time * 3 + enemy.phase) * 0.7 * dt;
    enemy.mesh.rotation.y = Math.PI;

    if (enemy.mesh.position.z > 20) {
      scene.remove(enemy.mesh);
      enemies.splice(i, 1);
      state.health -= 12;
      spawnImpact(enemy.mesh.position, 0xff5555);
      if (state.health <= 0) {
        state.health = 0;
        updateHud();
        endGame();
        return;
      }
      continue;
    }

    if (enemy.mesh.position.distanceTo(player.position) < 2.4) {
      scene.remove(enemy.mesh);
      enemies.splice(i, 1);
      state.health -= 25;
      spawnImpact(enemy.mesh.position, 0xff9e00);
      if (state.health <= 0) {
        state.health = 0;
        updateHud();
        endGame();
        return;
      }
    }
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.mesh.position.addScaledVector(bullet.velocity, dt);

    if (bullet.mesh.position.z > 120) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      if (bullet.mesh.position.distanceTo(enemy.mesh.position) < 1.8) {
        scene.remove(bullet.mesh);
        bullets.splice(i, 1);
        scene.remove(enemy.mesh);
        enemies.splice(j, 1);
        state.score += 10;
        spawnImpact(enemy.mesh.position, 0xffe66d);
        updateHud();
        break;
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.position.addScaledVector(particle.userData.velocity, dt);
    particle.userData.velocity.multiplyScalar(0.95);
    if (particle.userData.velocity.length() < 0.05) {
      scene.remove(particle);
      particles.splice(i, 1);
    }
  }
}

function updateClouds(dt) {
  for (const cloud of clouds) {
    cloud.position.z += dt * 8;
    if (cloud.position.z > 18) cloud.position.z = -120;
  }
}

function animate() {
  const dt = Math.min(0.033, clock.getDelta());
  state.time += dt;

  if (state.started && !state.gameOver) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateParticles(dt);
    updateClouds(dt);
    state.worldSpeed += dt * 0.06;
    updateHud();
  }

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.position.x * 0.7, 0.08);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, player.position.y * 0.7 + 4.2, 0.08);
  camera.lookAt(player.position.x, player.position.y, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const clock = new THREE.Clock();
updateHud();
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
