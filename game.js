'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
class ShootingStar extends Asteroid {
  constructor() {
    const edge = randInt(0, 3);
    let x, y, angle;
    const inset = 0;

    if (edge === 0) {        // arriba
      x = rand(20, W - 20);
      y = inset;
      angle = Math.PI / 2 + rand(-0.55, 0.55);
    } else if (edge === 1) { // derecha
      x = W - inset;
      y = rand(20, H - 20);
      angle = Math.PI + rand(-0.55, 0.55);
    } else if (edge === 2) { // abajo
      x = rand(20, W - 20);
      y = H - inset;
      angle = -Math.PI / 2 + rand(-0.55, 0.55);
    } else {                 // izquierda
      x = inset;
      y = rand(20, H - 20);
      angle = rand(-0.55, 0.55);
    }

    super(x, y, 1);
    this.radius = 12;
    this.ttl = rand(4.5, 6);
    this.maxTtl = this.ttl;
    this.bonus = 500;
    this.boom = 16;

    const speed = rand(300, 380);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);

    // Polígono en forma de estrella de 5 puntas
    const spikes = 5;
    this.verts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const r = (i % 2 === 0) ? this.radius : this.radius * 0.45;
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      for (let i = 0; i < 6; i++) particles.push(new Particle(this.x, this.y));
    }
  }

  split() {
    return [];
  }

  draw() {
    const alpha = Math.max(0, this.ttl / this.maxTtl);

    ctx.save();
    ctx.translate(this.x, this.y);

    // Estela luminosa en contra del movimiento
    const speed = Math.hypot(this.vx, this.vy);
    const tailLen = 55;
    const tx = (this.vx / speed) * tailLen;
    const ty = (this.vy / speed) * tailLen;

    const grad = ctx.createLinearGradient(0, 0, -tx, -ty);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha.toFixed(2)})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-tx, -ty);
    ctx.stroke();

    // Cuerpo estrellado
    ctx.rotate(this.rot);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

// ── Skins de la nave ──────────────────────────────────────────────────────────
// Cada skin define silueta (body, apuntando a +x), color de trazos y color de
// la llama. La hitbox (radius 12) es igual para todas.
const SKINS = [
  {
    name: 'CLÁSICA',
    stroke: '#fff',
    flame: 'rgba(255, 130, 0, 0.85)',
    body: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
  },
  {
    name: 'FURTIVA',
    stroke: '#9ef01a',
    flame: 'rgba(158, 240, 26, 0.85)',
    body: [[24, 0], [-14, -5], [-8, 0], [-14, 5]],
  },
  {
    name: 'COLIBRÍ',
    stroke: '#ffd166',
    flame: 'rgba(255, 0, 110, 0.85)',
    body: [[18, 0], [-6, -5], [-13, -12], [-9, 0], [-13, 12], [-6, 5]],
  },
  {
    name: 'TANQUE',
    stroke: '#6a994e',
    flame: 'rgba(231, 111, 81, 0.85)',
    body: [[16, 0], [4, -10], [-12, -10], [-6, -3], [-6, 3], [-12, 10], [4, 10]],
  },
  {
    name: 'NEÓN',
    stroke: '#f72585',
    flame: 'rgba(0, 255, 255, 0.85)',
    body: [[22, 0], [-4, -10], [-1, -3], [-14, 0], [-1, 3], [-4, 10]],
  },
];

const SKIN_KEY = 'asteroids-skin';

function loadSkinIndex() {
  try {
    const i = parseInt(localStorage.getItem(SKIN_KEY), 10);
    return Number.isInteger(i) ? wrap(i, SKINS.length) : 0;
  } catch {
    return 0;
  }
}

function saveSkinIndex(i) {
  try {
    localStorage.setItem(SKIN_KEY, String(i));
  } catch { /* localStorage no disponible */ }
}

let skinIndex = loadSkinIndex();
let skinToast = null;   // { name, ttl }

function cycleSkin(dir) {
  skinIndex = wrap(skinIndex + dir, SKINS.length);
  saveSkinIndex(skinIndex);
  skinToast = { name: SKINS[skinIndex].name, ttl: 1.5 };
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    const boost  = this.speedBoost > 0 ? 2 : 1;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * boost * dt;
      this.vy += Math.sin(this.angle) * THRUST * boost * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = this.speedBoost > 0 ? '#0ff' : skin.stroke;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta de la skin activa
    ctx.beginPath();
    ctx.moveTo(skin.body[0][0], skin.body[0][1]);
    for (let i = 1; i < skin.body.length; i++)
      ctx.lineTo(skin.body[i][0], skin.body[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor (sale de la cola del casco)
    if (this.thrusting && Math.random() > 0.35) {
      const rear = Math.min(...skin.body.map(([x]) => x));
      ctx.beginPath();
      ctx.moveTo(rear + 4, -4);
      ctx.lineTo(rear + 4 - rand(6, 14), 0);
      ctx.lineTo(rear + 4,  4);
      ctx.strokeStyle = skin.flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power Up: Velocidad ───────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.ttl = 10;
    this.dead = false;
    this.pulse = rand(0, Math.PI * 2);

    const angle = rand(0, Math.PI * 2);
    const speed = 40;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.pulse += dt * 5;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const scale = 1 + Math.sin(this.pulse) * 0.12;
    const alpha = 0.35 + Math.sin(this.pulse) * 0.15;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    // Rayo
    ctx.beginPath();
    ctx.moveTo( 5, -8);
    ctx.lineTo(-5,  2);
    ctx.lineTo( 0,  2);
    ctx.lineTo(-2,  9);
    ctx.lineTo( 8, -2);
    ctx.lineTo( 3, -2);
    ctx.closePath();
    ctx.stroke();

    // Aura pulsante
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha.toFixed(2)})`;
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let starTimer;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  starTimer = rand(8, 15);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  ship.reset();
  starTimer = rand(8, 15);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoost = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambio de skin (S/Q), disponible en cualquier estado
  if (pressed('KeyS')) cycleSkin(1);
  if (pressed('KeyQ')) cycleSkin(-1);
  if (skinToast) {
    skinToast.ttl -= dt;
    if (skinToast.ttl <= 0) skinToast = null;
  }

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Estrella fugaz
  if (!asteroids.some(a => a instanceof ShootingStar)) {
    starTimer -= dt;
    if (starTimer <= 0) {
      asteroids.push(new ShootingStar());
      starTimer = rand(8, 15);
    }
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.bonus ?? POINTS[a.size];
        explode(a.x, a.y, a.boom ?? a.size * 5);
        if (Math.random() < 0.08) powerups.push(new PowerUp(a.x, a.y));
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  powerups.forEach(pu => pu.update(dt));
  powerups = powerups.filter(pu => !pu.dead);

  // Nave vs power-up
  for (const pu of powerups) {
    if (!pu.dead && dist(ship, pu) < ship.radius + pu.radius) {
      pu.dead = true;
      ship.speedBoost = 5;
      explode(pu.x, pu.y, 6);
    }
  }

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  const s = 0.45;   // escala del ícono respecto a la nave
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.body[0][0] * s, skin.body[0][1] * s);
  for (let i = 1; i < skin.body.length; i++)
    ctx.lineTo(skin.body[i][0] * s, skin.body[i][1] * s);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Barra de tiempo del power-up Velocidad
  if (ship.speedBoost > 0) {
    const pad  = 14;
    const barW = 120;
    const barH = 10;
    const y    = H - 26;
    const pct  = Math.max(0, ship.speedBoost / 5);

    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#0ff';
    ctx.fillText('VELOCIDAD', pad, y - 6);

    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, y, barW, barH);

    ctx.fillStyle = '#0ff';
    ctx.fillRect(pad, y, barW * pct, barH);

    ctx.fillStyle = '#fff';
    ctx.fillText(`${ship.speedBoost.toFixed(1)}s`, pad + barW + 8, y + barH - 1);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function drawSkinToast() {
  if (!skinToast) return;
  const alpha = Math.min(1, skinToast.ttl / 0.4);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 16px monospace';
  ctx.fillStyle   = SKINS[skinIndex].stroke;
  ctx.fillText(`SKIN: ${skinToast.name}`, W / 2, H - 40);
  ctx.restore();
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(pu => pu.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();
  drawSkinToast();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO REINICIA · S/Q CAMBIA NAVE`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
