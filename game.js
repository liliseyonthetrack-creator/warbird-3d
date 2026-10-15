import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd1ff);
scene.fog = new THREE.Fog(0x9fd1ff, 30, 160);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 4, 26);

const hemi = new THREE.HemisphereLight(0xeaf7ff, 0x264d62, 1.5);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.35);
sun.position.set(18, 30, 16);
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const clouds = [];
for (let i = 0; i < 20; i += 1) {
  const cloud = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  const puffGeo = new THREE.SphereGeometry(1.4, 16, 16);
  for (let j = 0; j < 5; j += 1) {
    const puff = new THREE.Mesh(puffGeo, material);
    puff.position.set((j - 2) * 1.6, Math.random() * 1.8, Math.random() * 2 - 1);
    cloud.add(puff);
  }
  cloud.position.set((Math.random() - 0.5) * 40, 10 + Math.random() * 8, -Math.random() * 120);
  scene.add(cloud);
  clouds.push(cloud);
}

const towers = [];
for (let i = 0; i < 14; i += 1) {
  const tower = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 2.1, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x7d8a94, roughness: 0.9 })
  );
  base.position.y = 2.5;
  tower.add(base);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.4, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x3d4a50, roughness: 0.8 })
  );
  top.position.y = 6.3;
  tower.add(top);

  tower.position.set((Math.random() - 0.5) * 60, 0, -30 - Math.random() * 100);
  scene.add(tower);
  towers.push(tower);
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 260),
  new THREE.MeshStandardMaterial({ color: 0x446b40, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -8;
scene.add(ground);

const hills = [];
for (let i = 0; i < 20; i += 1) {
  const hill = new THREE.Mesh(
    new THREE.ConeGeometry(8 + Math.random() * 5, 12 + Math.random() * 8, 26),
    new THREE.MeshStandardMaterial({ color: 0x355a35, roughness: 1 })
  );
  hill.position.set((i - 10) * 7.5, -4, -15 - i * 8);
  hill.rotation.z = (Math.random() - 0.5) * 0.8;
  scene.add(hill);
  hills.push(hill);
}

const hud = {
  health: document.getElementById('health'),
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  missionText: document.getElementById('missionText'),
  objectiveText: document.getElementById('objectiveText'),
  startOverlay: document.getElementById('startOverlay'),
  gameOverOverlay: document.getElementById('gameOverOverlay'),
  finalScore: document.getElementById('finalScore'),
  muteButton: document.getElementById('muteButton')
};

const state = {
  started: false,
  gameOver: false,
  score: 0,
  best: Number(localStorage.getItem('warbird-best') || 0),
  health: 100,
  fireCooldown: 0,
  enemyTimer: 1,
  time: 0,
  worldSpeed: 18,
  cameraMode: 'third',
  soundEnabled: true,
  mission: 'Operation: Iron Talon',
  objective: 'Secure the ridgeline and destroy hostile interceptors.'
};

const keys = {};
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Space') event.preventDefault();
  if (event.code === 'KeyC') toggleCamera();
  if (event.code === 'KeyM') toggleSound();
  if (event.code === 'Enter' && state.gameOver) startGame();
});
window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
hud.muteButton.addEventListener('click', toggleSound);
window.addEventListener('pointerdown', () => {
  if (!state.started) startGame();
  if (state.gameOver) startGame();
});

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  hud.muteButton.textContent = `Sound: ${state.soundEnabled ? 'ON' : 'OFF'}`;
  if (state.soundEnabled) playTone('sawtooth', 240, 0.08, 0.03);
}

function ensureAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) return null;
  if (!audio.ctx) audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  return audio.ctx;
}

const audio = { ctx: null };

function playTone(type, frequency, duration = 0.12, volume = 0.06, slide = 0) {
  if (!state.soundEnabled) return;
  const ctx = ensureAudio();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), ctx.currentTime + duration);

  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playShot() {
  playTone('square', 420, 0.07, 0.04, 100);
}

function playExplosion() {
  playTone('sawtooth', 120, 0.25, 0.06, -40);
}

function playHit() {
  playTone('triangle', 240, 0.10, 0.04, 60);
}

function updateMissionText() {
  hud.missionText.textContent = state.mission;
  hud.objectiveText.textContent = state.objective;
}

function buildPlayer() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.45, roughness: 0.55 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x1b6ff2, metalness: 0.2, roughness: 0.7 });

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 3.5, 4, 12), bodyMat);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.scale.set(1.1, 1, 1);
  group.add(fuselage);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 18), bodyMat);
  head.position.set(1.1, 0.45, 0.15);
  head.scale.set(1.15, 0.82, 0.9);
  group.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 12), accentMat);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(1.95, 0.5, 0.15);
  group.add(beak);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.68, 18, 18), accentMat);
  cockpit.position.set(0.9, 0.7, 0.25);
  cockpit.scale.set(1.4, 0.9, 1.2);
  group.add(cockpit);

  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 5.2), wingMat);
  leftWing.position.set(-1.65, -0.1, 0);
  leftWing.rotation.z = 0.28;
  group.add(leftWing);

  const rightWing = leftWing.clone();
  rightWing.position.x = 1.65;
  rightWing.rotation.z = -0.28;
  group.add(rightWing);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 1.8), wingMat);
  tail.position.set(0, 0.75, -2.7);
  group.add(tail);

  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.2, 16), accentMat);
  engine.rotation.z = Math.PI / 2;
  engine.position.set(0, -0.55, 2.2);
  group.add(engine);

  const blaster = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1.8), new THREE.MeshStandardMaterial({ color: 0xffcf33 }));
  blaster.position.set(0, -0.15, 2.9);
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
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x0e1622, roughness: 0.8 });

  const core = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 2.1), bodyMat);
  group.add(core);

  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 4.2), wingMat);
  leftWing.position.set(-1.4, 0, 0);
  leftWing.rotation.z = 0.32;
  group.add(leftWing);

  const rightWing = leftWing.clone();
  rightWing.position.x = 1.4;
  rightWing.rotation.z = -0.32;
  group.add(rightWing);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.5), wingMat);
  tail.position.set(0, 0.9, -2.2);
  group.add(tail);

  const enemy = {
    mesh: group,
    speed: 8 + Math.random() * 6,
    phase: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 1.8,
    fireCooldown: 1 + Math.random() * 1.6,
    hp: 1
  };

  enemy.mesh.position.set((Math.random() - 0.5) * 16, Math.random() * 7 - 2, -60 - Math.random() * 70);
  scene.add(enemy.mesh);
  enemies.push(enemy);
}

function spawnBullet(position, velocity, color = 0xfff5a8) {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.5
  });
  const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), material);
  bullet.position.copy(position);
  scene.add(bullet);
  bullets.push({ mesh: bullet, velocity });
}

function spawnImpact(position, color = 0xff7b00) {
  for (let i = 0; i < 12; i += 1) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.15 })
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

function toggleCamera() {
  if (state.cameraMode === 'third') {
    state.cameraMode = 'fpv';
  } else {
    state.cameraMode = 'third';
  }
}

function startGame() {
  state.started = true;
  state.gameOver = false;
  state.score = 0;
  state.health = 100;
  state.fireCooldown = 0;
  state.enemyTimer = 1.2;
  state.time = 0;
  state.worldSpeed = 18;
  state.cameraMode = 'third';

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
  updateMissionText();
  updateHud();
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
  const fire = !!(pad.buttons[6]?.pressed || pad.buttons[7]?.pressed || pad.buttons[0]?.pressed);
  const boost = !!(pad.buttons[1]?.pressed || pad.buttons[5]?.pressed);
  return { x, y, fire, boost };
}

function updatePlayer(dt) {
  const pad = checkGamepad();
  let moveX = 0;
  let moveY = 0;

  if (keys.KeyA || keys.ArrowLeft) moveX -= 1;
  if (keys.KeyD || keys.ArrowRight) moveX += 1;
  if (keys.KeyW || keys.ArrowUp) moveY += 1;
  if (keys.KeyS || keys.ArrowDown) moveY -= 1;

  moveX += pad.x;
  moveY -= pad.y;

  const boost = keys.Shift || pad.boost;
  const speed = boost ? 18 : 10;

  player.position.x += moveX * speed * dt;
  player.position.y += moveY * speed * dt;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -12, 12);
  player.position.y = THREE.MathUtils.clamp(player.position.y, -3.8, 9.5);

  const targetXRot = -moveY * 0.6;
  const targetZRot = -moveX * 0.6;
  player.rotation.x = THREE.MathUtils.lerp(player.rotation.x, targetXRot, 0.12);
  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, targetZRot, 0.12);
  player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, moveX * 0.26, 0.14);

  const firing = keys.Space || pad.fire;
  if (firing && state.fireCooldown <= 0) {
    const bulletPos = player.position.clone().add(new THREE.Vector3(0, 0, 3.2));
    const bulletVel = new THREE.Vector3(0, 0, 34);
    spawnBullet(bulletPos, bulletVel);
    playShot();
    state.fireCooldown = 0.18;
  }
  state.fireCooldown = Math.max(0, state.fireCooldown - dt);
}

function updateEnemies(dt) {
  state.enemyTimer -= dt;
  if (state.enemyTimer <= 0) {
    buildEnemy();
    state.enemyTimer = Math.max(0.6, 1.25 - state.score / 340);
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const pos = enemy.mesh.position;
    const targetX = player.position.x * 0.85;
    const targetY = player.position.y * 0.85;

    pos.x += (targetX - pos.x) * 0.6 * dt;
    pos.y += (targetY - pos.y) * 0.8 * dt;
    pos.z += (enemy.speed + state.worldSpeed * 0.5) * dt;

    pos.x += Math.sin(state.time * 2 + enemy.phase) * enemy.drift * dt * 3;
    pos.y += Math.cos(state.time * 2.6 + enemy.phase) * 0.7 * dt;
    pos.x = THREE.MathUtils.clamp(pos.x, -16, 16);
    pos.y = THREE.MathUtils.clamp(pos.y, -8, 10);

    enemy.mesh.rotation.y = Math.PI;
    enemy.fireCooldown -= dt;

    if (enemy.fireCooldown <= 0 && pos.distanceTo(player.position) < 28) {
      const dir = player.position.clone().sub(pos).normalize();
      const shotPos = pos.clone().add(new THREE.Vector3(0, 0, 1.8));
      const shotVel = dir.multiplyScalar(20);
      spawnBullet(shotPos, shotVel, 0xff8c42);
      enemy.fireCooldown = 1.5 + Math.random() * 1.5;
    }

    if (pos.z > 22) {
      scene.remove(enemy.mesh);
      enemies.splice(i, 1);
      state.health -= 12;
      spawnImpact(pos, 0xff5555);
      playHit();
      if (state.health <= 0) {
        state.health = 0;
        updateHud();
        endGame();
        return;
      }
      continue;
    }

    if (pos.distanceTo(player.position) < 2.3) {
      scene.remove(enemy.mesh);
      enemies.splice(i, 1);
      state.health -= 25;
      spawnImpact(pos, 0xff9e00);
      playExplosion();
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

    if (bullet.mesh.position.length() > 220) {
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
        spawnImpact(enemy.mesh.position, 0xffe67d);
        playExplosion();
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

function updateWorld(dt) {
  for (const cloud of clouds) {
    cloud.position.z += dt * (8 + state.worldSpeed * 0.12);
    if (cloud.position.z > 18) cloud.position.z = -120;
  }

  for (const tower of towers) {
    tower.position.z += dt * state.worldSpeed * 0.7;
    if (tower.position.z > 18) {
      tower.position.z = -160;
      tower.position.x = (Math.random() - 0.5) * 60;
    }
  }
}

function updateCamera() {
  if (state.cameraMode === 'fpv') {
    camera.position.lerp(player.position.clone().add(new THREE.Vector3(0, 0.5, 2.4)), 0.18);
    camera.lookAt(player.position.x, player.position.y + 0.8, 0);
  } else {
    const desired = new THREE.Vector3(player.position.x * 0.75, player.position.y * 0.75 + 4.2, 24);
    camera.position.lerp(desired, 0.08);
    camera.lookAt(player.position.x, player.position.y, 0);
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
    updateWorld(dt);
    state.worldSpeed += dt * 0.06;
    updateHud();
  }

  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const clock = new THREE.Clock();
updateMissionText();
updateHud();
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
