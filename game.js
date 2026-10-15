import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/*
  v2.0: Full combat upgrade — Black Falcon, basic flight physics with velocity/accel,
  wing movement animation, missiles (homing), boss encounter, improved AI.
*/

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd1ff);
scene.fog = new THREE.Fog(0x9fd1ff, 30, 400);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 4, 28);

const hemi = new THREE.HemisphereLight(0xeaf7ff, 0x264d62, 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.45);
sun.position.set(18, 30, 16);
scene.add(sun);

// world
const world = new THREE.Group();
scene.add(world);

// clouds, towers, hills as earlier
const clouds = [];
for (let i = 0; i < 30; i++) {
  const cloud = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  const puffGeo = new THREE.SphereGeometry(1.6, 12, 12);
  for (let j = 0; j < 6; j++) {
    const puff = new THREE.Mesh(puffGeo, material);
    puff.position.set((j - 2.5) * 1.4, Math.random() * 2, Math.random() * 3 - 1.5);
    cloud.add(puff);
  }
  cloud.position.set((Math.random() - 0.5) * 120, 8 + Math.random() * 12, -Math.random() * 400);
  scene.add(cloud);
  clouds.push(cloud);
}

const towers = [];
for (let i = 0; i < 20; i++) {
  const tower = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.1, 6, 12), new THREE.MeshStandardMaterial({ color: 0x7d8a94, roughness: 0.95 }));
  base.position.y = 2.5; tower.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x3d4a50, roughness: 0.8 }));
  top.position.y = 6.3; tower.add(top);
  tower.position.set((Math.random() - 0.5) * 180, 0, -40 - Math.random() * 600);
  scene.add(tower); towers.push(tower);
}

const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: 0x445f42, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -12; scene.add(ground);

// HUD refs
const hud = {
  health: document.getElementById('health'),
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  missionText: document.getElementById('missionText'),
  objectiveText: document.getElementById('objectiveText'),
  startOverlay: document.getElementById('startOverlay'),
  gameOverOverlay: document.getElementById('gameOverOverlay'),
  finalScore: document.getElementById('finalScore'),
  muteButton: document.getElementById('muteButton'),
  weapons: document.getElementById('weapons')
};

// state
const state = {
  started: false,
  gameOver: false,
  score: 0,
  best: Number(localStorage.getItem('warbird-best') || 0),
  health: 200,
  time: 0,
  worldSpeed: 40,
  cameraMode: 'third',
  soundEnabled: true,
  missileCount: 2,
  bossAlive: false
};

// inputs
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// audio (basic oscillator SFX)
const audio = { ctx: null };
function ensureAudio() { if (!audio.ctx) audio.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (audio.ctx.state === 'suspended') audio.ctx.resume(); return audio.ctx; }
function simpleSfx(freq, type = 'sine', dur = 0.08, vol = 0.04) {
  if (!state.soundEnabled) return; const ctx = ensureAudio(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = vol; o.connect(g); g.connect(ctx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur); o.stop(ctx.currentTime + dur + 0.02);
}

function toggleSound() { state.soundEnabled = !state.soundEnabled; hud.muteButton.textContent = `Sound: ${state.soundEnabled ? 'ON' : 'OFF'}`; }
hud.muteButton.addEventListener('click', toggleSound);

// Player (Black Falcon) with physics
function buildBlackFalcon() {
  const group = new THREE.Group();
  // simple low-poly 'falcon' with moveable wings
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.2, roughness: 0.6 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 3.0, 4, 12), bodyMat);
  fuselage.rotation.z = Math.PI / 2; fuselage.scale.set(1.05, 1, 1);
  group.add(fuselage);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), bodyMat);
  head.position.set(1.1, 0.35, 0.12); group.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 10), accent);
  beak.rotation.z = -Math.PI / 2; beak.position.set(1.6, 0.45, 0.12); group.add(beak);

  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 5.2), accent);
  leftWing.position.set(-1.6, -0.1, 0); leftWing.rotation.z = 0.22; leftWing.name = 'leftWing'; group.add(leftWing);
  const rightWing = leftWing.clone(); rightWing.position.x = 1.6; rightWing.rotation.z = -0.22; rightWing.name = 'rightWing'; group.add(rightWing);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.6), accent); tail.position.set(0, 0.8, -2.3); group.add(tail);

  // store wing refs for animation
  group.userData.leftWing = leftWing; group.userData.rightWing = rightWing;

  return group;
}

const player = buildBlackFalcon();
player.position.set(0, 2, 32);
scene.add(player);

// player physics
player.userData.velocity = new THREE.Vector3(0, 0, -28); // forward relative to world -z
player.userData.acceleration = new THREE.Vector3(0, 0, 0);
player.userData.maxSpeed = 120; // forward
player.userData.drag = 0.98;
player.userData.pitch = 0; player.userData.roll = 0;

// enemies, missiles, bullets, boss
const enemies = [];
const bullets = [];
const missiles = [];
const particles = [];

function spawnEnemy(type = 'interceptor') {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: type === 'boss' ? 0x662222 : 0xcc3333, roughness: 0.8 });
  const core = new THREE.Mesh(new THREE.BoxGeometry(type === 'boss' ? 6 : 1.6, type === 'boss' ? 4 : 1.1, type === 'boss' ? 8 : 2.1), mat);
  group.add(core);
  const enemy = { mesh: group, speed: (type === 'boss' ? 6 : 8 + Math.random() * 6), phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 2, hp: type === 'boss' ? 40 : 2, type };
  enemy.mesh.position.set((Math.random() - 0.5) * 60, Math.random() * 18 - 3, -200 - Math.random() * 400);
  scene.add(enemy.mesh); enemies.push(enemy);
}

// missiles: homing towards a target
function launchMissile(origin, initialVel) {
  if (state.missileCount <= 0) return;
  state.missileCount -= 1; hud.weapons.textContent = `GUN / MISSILES: ${state.missileCount}`;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0xffdd66, emissive: 0xff8844 }));
  mesh.rotation.x = Math.PI / 2; mesh.position.copy(origin);
  const missile = { mesh, velocity: initialVel.clone(), life: 12, target: null, speed: 60 };
  // find nearest enemy in front cone
  let best = null; let bestDist = 1e6;
  for (const e of enemies) {
    const d = e.mesh.position.distanceTo(origin);
    if (d < bestDist) { best = e; bestDist = d; }
  }
  if (best) missile.target = best;
  scene.add(mesh); missiles.push(missile);
  simpleSfx(420, 'sawtooth', 0.14, 0.06);
}

// bullets (gun)
function fireGun(pos, vel) {
  const material = new THREE.MeshStandardMaterial({ color: 0xfff5a8, emissive: 0xffe1a3 });
  const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), material);
  bullet.position.copy(pos); scene.add(bullet); bullets.push({ mesh: bullet, velocity: vel.clone(), life: 3 });
  simpleSfx(880, 'square', 0.06, 0.03);
}

// impacts
function spawnImpact(position, color = 0xff7b00) {
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color, emissive: color }));
    p.position.copy(position); p.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    scene.add(p); particles.push(p);
  }
}

// Player input-driven physics update
function updatePlayerPhysics(dt) {
  // local forward axis points toward -z in world (we use world axes simplification)
  // inputs
  const pad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  let ix = 0, iy = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (pad) { ix += (pad.axes[0] || 0); iy -= (pad.axes[1] || 0); }

  const boost = keys.Shift || (pad && (pad.buttons[1]?.pressed));
  const forwardAcc = (boost ? 140 : 80);

  // convert to acceleration in world: we push along -z plus small vertical/horizontal components
  const forward = new THREE.Vector3(0, 0, -1);
  // accel
  const acc = forward.multiplyScalar(forwardAcc * (iy > 0 ? 1 : (iy < 0 ? 0.45 : 0.6)));
  acc.x += ix * 60; acc.y += iy * 30;

  // integrate
  player.userData.velocity.addScaledVector(acc, dt);
  // clamp speeds
  if (player.userData.velocity.length() > player.userData.maxSpeed) player.userData.velocity.setLength(player.userData.maxSpeed);

  // drag
  player.userData.velocity.multiplyScalar(Math.pow(player.userData.drag, dt * 60));

  // position update
  player.position.addScaledVector(player.userData.velocity, dt);

  // keep in bounds
  player.position.x = THREE.MathUtils.clamp(player.position.x, -220, 220);
  player.position.y = THREE.MathUtils.clamp(player.position.y, -6, 70);
  player.position.z = Math.min(player.position.z, 400);

  // orientation targets from inputs and velocity
  const targetPitch = - (player.userData.velocity.y / 80) - (iy * 0.4);
  const targetRoll = - (player.userData.velocity.x / 140) - (ix * 0.6);
  player.rotation.x = THREE.MathUtils.lerp(player.rotation.x, targetPitch, 0.08);
  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, targetRoll, 0.08);

  // wing flapping/tilt animation based on speed and pitch
  const lw = player.userData.leftWing; const rw = player.userData.rightWing;
  if (lw && rw) {
    const flap = Math.sin(state.time * 12) * Math.min(0.35, Math.abs(player.userData.velocity.y) / 200);
    lw.rotation.x = THREE.MathUtils.lerp(lw.rotation.x, flap + 0.08, 0.12);
    rw.rotation.x = THREE.MathUtils.lerp(rw.rotation.x, -flap - 0.08, 0.12);
    // slight wing roll when turning
    lw.rotation.z = THREE.MathUtils.lerp(lw.rotation.z, 0.22 + targetRoll * 0.12, 0.12);
    rw.rotation.z = THREE.MathUtils.lerp(rw.rotation.z, -0.22 + targetRoll * 0.12, 0.12);
  }

  // firing
  const firing = keys.Space || (pad && (pad.buttons[7]?.pressed || pad.buttons[0]?.pressed));
  if (firing && state.lastFireTime && (state.time - state.lastFireTime) > 0.12) {
    const pos = player.position.clone().add(new THREE.Vector3(0, 0, -6));
    fireGun(pos, player.userData.velocity.clone().setZ(-120));
    state.lastFireTime = state.time;
  } else if (firing && !state.lastFireTime) { state.lastFireTime = state.time; }

}

// missile update
function updateMissiles(dt) {
  for (let i = missiles.length - 1; i >= 0; i--) {
    const m = missiles[i];
    if (m.target && enemies.includes(m.target) === false) m.target = null;
    if (m.target) {
      const dir = m.target.mesh.position.clone().sub(m.mesh.position).normalize();
      // steer towards target
      m.velocity.lerp(dir.multiplyScalar(m.speed), 0.08);
    }
    m.mesh.position.addScaledVector(m.velocity, dt);
    m.life -= dt; if (m.life <= 0) { scene.remove(m.mesh); missiles.splice(i, 1); continue; }
    // check collision
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (m.mesh.position.distanceTo(e.mesh.position) < (e.type === 'boss' ? 6 : 2.2)) {
        // hit
        e.hp -= 12; spawnImpact(e.mesh.position); simpleSfx(120, 'triangle', 0.2, 0.06);
        scene.remove(m.mesh); missiles.splice(i, 1);
        if (e.hp <= 0) { destroyEnemy(e); }
        break;
      }
    }
  }
}

// bullets update
function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]; b.mesh.position.addScaledVector(b.velocity, dt); b.life -= dt;
    if (b.life <= 0) { scene.remove(b.mesh); bullets.splice(i, 1); continue; }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j]; if (b.mesh.position.distanceTo(e.mesh.position) < (e.type === 'boss' ? 4.2 : 1.8)) {
        e.hp -= 4; spawnImpact(b.mesh.position); scene.remove(b.mesh); bullets.splice(i, 1); simpleSfx(300, 'triangle', 0.06, 0.03);
        if (e.hp <= 0) destroyEnemy(e); break;
      }
    }
  }
}

function destroyEnemy(e) {
  simpleSfx(100, 'sawtooth', 0.25, 0.06); spawnImpact(e.mesh.position, 0xffcc66); state.score += (e.type === 'boss' ? 500 : 25); updateHud();
  scene.remove(e.mesh); const idx = enemies.indexOf(e); if (idx >= 0) enemies.splice(idx, 1);
  // spawn small debris
}

// enemy AI update
function updateEnemies(dt) {
  // spawn waves, boss once score threshold reached
  if (!state.bossAlive && state.score >= 300 && Math.random() < 0.003) {
    spawnEnemy('boss'); state.bossAlive = true; simpleSfx(200, 'sawtooth', 0.4, 0.06); hud.missionText.textContent = 'BOSS: SKY DREADNOUGHT';
  }
  // regular spawn
  if (Math.random() < 0.02) { spawnEnemy('interceptor'); }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i]; const pos = e.mesh.position;
    // behavior: if boss, do slow approach, launch missiles periodically
    if (e.type === 'boss') {
      // move towards ridgeline
      pos.z += (e.speed - 2) * dt;
      pos.x += Math.sin(state.time * 0.4 + e.phase) * 6 * dt;
      pos.y = THREE.MathUtils.lerp(pos.y, 12 + Math.sin(state.time * 0.8) * 8, 0.01);
      // boss fires salvos
      if (!e.lastVolley || state.time - e.lastVolley > 4.5) {
        e.lastVolley = state.time; // spawn many small bullets
        for (let k = 0; k < 8; k++) {
          const dir = new THREE.Vector3(Math.sin(k), Math.random() * 0.2 - 0.1, 1).normalize();
          spawnBullet(e.mesh.position.clone().add(new THREE.Vector3(0, -1, 2)), dir.multiplyScalar(30), 0xff3344);
        }
      }
    } else {
      // interceptor: pursue player lightly
      const target = player.position.clone();
      pos.x += (target.x - pos.x) * 0.2 * dt * (1 + Math.random() * 0.6);
      pos.y += (target.y - pos.y) * 0.18 * dt;
      pos.z += e.speed * dt + state.worldSpeed * 0.14 * dt;
      // occasional shot at player
      if (!e.lastShot) e.lastShot = 0; e.lastShot -= dt;
      if (e.lastShot <= 0 && pos.distanceTo(player.position) < 120) { e.lastShot = 1.4 + Math.random() * 1.6; const dir = player.position.clone().sub(pos).normalize(); spawnBullet(pos.clone().add(new THREE.Vector3(0, 0, 2)), dir.multiplyScalar(28), 0xff8c42); }
    }

    // out-of-range or collision with player
    if (pos.z > player.position.z + 60) { // passed player
      scene.remove(e.mesh); enemies.splice(i, 1); state.health -= 10; spawnImpact(pos, 0xff4444); if (state.health <= 0) { endGame(); return; }
      continue;
    }
    if (pos.distanceTo(player.position) < (e.type === 'boss' ? 6 : 2.6)) { // collision
      scene.remove(e.mesh); enemies.splice(i, 1); state.health -= (e.type === 'boss' ? 60 : 28); spawnImpact(pos); if (state.health <= 0) { endGame(); return; }
    }
  }
}

// helper to spawn a bullet from enemies (reused)
function spawnBullet(pos, vel, color = 0xffd1a3) {
  const material = new THREE.MeshStandardMaterial({ color, emissive: color });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), material);
  b.position.copy(pos); scene.add(b); bullets.push({ mesh: b, velocity: vel.clone(), life: 6 });
}

// particles update
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.position.addScaledVector(p.userData.velocity, dt); p.userData.velocity.multiplyScalar(0.95);
    if (p.userData.velocity.length() < 0.05) { scene.remove(p); particles.splice(i, 1); }
  }
}

// HUD
function updateHud() { hud.health.textContent = Math.max(0, Math.round(state.health)); hud.score.textContent = Math.round(state.score); hud.best.textContent = state.best; hud.weapons.textContent = `GUN / MISSILES: ${state.missileCount}`; }

// controls: missile (X) and camera toggle
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyX') {
    // launch missile from nose
    const origin = player.position.clone().add(new THREE.Vector3(0, 0, -6));
    const vel = new THREE.Vector3(0, 0, -1).multiplyScalar(60).add(player.userData.velocity.clone().multiplyScalar(0.3));
    launchMissile(origin, vel);
  }
  if (e.code === 'KeyC') state.cameraMode = state.cameraMode === 'third' ? 'fpv' : 'third';
  if (e.code === 'KeyM') toggleSound();
});

// camera update
function updateCamera() {
  if (state.cameraMode === 'fpv') {
    const desired = player.position.clone().add(new THREE.Vector3(0, 0.8, -3));
    camera.position.lerp(desired, 0.16);
    camera.lookAt(player.position.x, player.position.y + 1.4, player.position.z - 12);
  } else {
    const desired = player.position.clone().add(new THREE.Vector3(player.position.x * 0.08, 4.5, 34));
    camera.position.lerp(desired, 0.08);
    camera.lookAt(player.position.x, player.position.y, player.position.z - 12);
  }
}

// game loop
const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(0.033, clock.getDelta()); state.time += dt;
  if (state.started && !state.gameOver) {
    updatePlayerPhysics(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateMissiles(dt);
    updateParticles(dt);
    // world movement
    for (const c of clouds) { c.position.z += dt * (18 + state.worldSpeed * 0.05); if (c.position.z > 80) c.position.z = -800; }
    for (const t of towers) { t.position.z += dt * state.worldSpeed * 0.08; if (t.position.z > 80) { t.position.z = -600; t.position.x = (Math.random() - 0.5) * 180; } }
    state.score += dt * 0.6; // passive scoring
    updateHud();
  }
  updateCamera(); renderer.render(scene, camera); requestAnimationFrame(animate);
}

// start / reset / end
function startGame() {
  state.started = true; state.gameOver = false; state.score = 0; state.health = 200; state.missileCount = 2; state.bossAlive = false; state.time = 0;
  // reset world lists
  enemies.forEach(e => scene.remove(e.mesh)); bullets.forEach(b => scene.remove(b.mesh)); missiles.forEach(m => scene.remove(m.mesh)); particles.forEach(p => scene.remove(p));
  enemies.length = bullets.length = missiles.length = particles.length = 0;
  player.position.set(0, 2, 32); player.userData.velocity.set(0, 0, -28);
  hud.startOverlay.classList.add('hidden'); hud.gameOverOverlay.classList.add('hidden'); updateHud();
}

function endGame() {
  state.gameOver = true; state.started = false; state.best = Math.max(state.best, Math.round(state.score)); localStorage.setItem('warbird-best', String(state.best)); hud.finalScore.textContent = `Score: ${Math.round(state.score)}`; hud.gameOverOverlay.classList.remove('hidden');
}

// wire UI
document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('restartButton').addEventListener('click', startGame);
window.addEventListener('pointerdown', (e) => { if (!state.started) startGame(); if (state.gameOver) startGame(); });

updateHud(); requestAnimationFrame(animate);
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

