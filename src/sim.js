import { LEVELS, platformAt } from './levels.js?v=9287663670c9';

export const PHYSICS = Object.freeze({ speed: 220, acceleration: 1800, friction: 2350, gravity: 1500, jump: 660, radius: 19, height: 47, coyoteTime: 0.09, jumpBuffer: 0.12 });
const approach = (value, target, delta) => value < target ? Math.min(target, value + delta) : Math.max(target, value - delta);

export class GameSim {
  constructor(levelIndex = 0) { this.load(levelIndex); }

  load(index) {
    this.index = index;
    this.level = LEVELS[index];
    this.time = 0;
    this.elapsed = 0;
    this.deaths = 0;
    this.collected = new Set();
    this.checkpoint = false;
    this.finished = false;
    this.particles = [];
    this.events = [];
    this.camera = 0;
    this.gait = 0;
    this.jumpRequested = 0;
    this.landImpact = 0;
    this.respawn();
  }

  respawn() {
    const x = this.checkpoint ? this.level.checkpoint : this.level.start;
    const platform = platformAt(this.level, x);
    this.player = { x, y: platform[1], vx: 0, vy: 0, grounded: true, coyote: PHYSICS.coyoteTime, dead: false, deadTime: 0, face: 1 };
    this.jumpRequested = 0;
    this.jumpCooldown = 0;
    this.landImpact = 0;
    this.camera = Math.max(0, x - 190);
  }

  emit(type, x, y, data = {}) { this.events.push({ type, x, y, ...data }); }

  burst(x, y, color, count = 10, force = 100) {
    // Deterministic particles make screenshots and replays reproducible.
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.time * 2.7;
      const speed = force * (0.45 + ((i * 37) % 17) / 23);
      this.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - force * 0.5, life: 0.6 + (i % 3) * 0.1, max: 0.8, color, size: 2 + i % 3 });
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
  }

  update(dt, input = {}) {
    this.time += dt;
    this.events.length = 0;
    this.landImpact = Math.max(0, this.landImpact - dt * 5);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.vx *= 1 - dt;
    }
    if (this.finished) return;
    this.elapsed += dt;
    const p = this.player;
    if (p.dead) {
      p.deadTime += dt;
      p.y += 140 * dt;
      if (p.deadTime > 0.65) { this.respawn(); this.emit('respawn', this.player.x, this.player.y); }
      return;
    }
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    if (input.jump) this.jumpRequested = PHYSICS.jumpBuffer;
    else this.jumpRequested = Math.max(0, this.jumpRequested - dt);
    p.coyote = p.grounded ? PHYSICS.coyoteTime : Math.max(0, p.coyote - dt);
    const move = Math.min(1, Math.max(0, Number(input.move) || 0));
    const target = move * PHYSICS.speed;
    if (p.grounded || move > 0) p.vx = approach(p.vx, target, (target ? PHYSICS.acceleration : PHYSICS.friction) * dt);
    else p.vx = approach(p.vx, PHYSICS.speed * 0.78, 350 * dt);
    if ((this.jumpRequested > 0 || input.voiceJump) && p.coyote > 0 && this.jumpCooldown <= 0) {
      p.vy = -PHYSICS.jump;
      p.grounded = false; p.coyote = 0;
      p.vx = Math.max(p.vx, PHYSICS.speed * 0.9);
      this.jumpRequested = 0; this.jumpCooldown = 0.22;
      this.emit('jump', p.x, p.y);
      this.burst(p.x, p.y - 2, '#ecedc5', 9, 55);
    }
    // Air momentum makes a short shout enough to clear a gap.
    const oldX = p.x, oldY = p.y;
    p.x += p.vx * dt;
    p.vy = Math.min(900, p.vy + PHYSICS.gravity * dt);
    p.y += p.vy * dt;
    p.grounded = false;
    for (const [x, y, w] of this.level.platforms) {
      if (p.x + PHYSICS.radius > x && p.x - PHYSICS.radius < x + w) {
        if (p.vy >= 0 && oldY <= y + 0.5 && p.y >= y) {
          const speed = p.vy;
          p.y = y; p.vy = 0; p.grounded = true;
          if (speed > 160) {
            this.landImpact = Math.min(1, speed / 700);
            this.emit('land', p.x, p.y, { force: speed });
            this.burst(p.x, p.y, '#ecedc5', 7, 35);
          }
        } else if (oldY > y + 1 && p.y > y + 8 && p.y - PHYSICS.height < y + 120) {
          // A cliff side is solid, so falling short never teleports the hero up.
          if (oldX + PHYSICS.radius <= x && p.x + PHYSICS.radius > x) { p.x = x - PHYSICS.radius; p.vx = 0; }
        }
      }
    }
    this.gait += Math.abs(p.x - oldX) / 14;
    for (let i = 0; i < this.level.coins.length; i++) {
      if (this.collected.has(i)) continue;
      const [x, y] = this.level.coins[i];
      if (Math.hypot(p.x - x, p.y - 29 - y) < 35) {
        this.collected.add(i); this.emit('coin', x, y);
        this.burst(x, y, '#e9be59', 9, 85);
      }
    }
    for (const [x, y, w] of this.level.hazards) {
      if (p.x + 13 > x && p.x - 13 < x + w && p.y > y - 18 && p.y - PHYSICS.height < y + 12) this.kill();
    }
    if (!this.checkpoint && p.x >= this.level.checkpoint && p.grounded) {
      this.checkpoint = true; this.emit('checkpoint', p.x, p.y); this.burst(p.x, p.y - 35, '#d9ee83', 20, 140);
    }
    if (p.y > 610) this.kill();
    if (!p.dead && p.x >= this.level.finish) {
      this.finished = true; this.emit('finish', p.x, p.y); this.burst(p.x, p.y - 70, '#d9ee83', 45, 240);
    }
  }

  kill() {
    if (this.player.dead) return;
    this.player.dead = true; this.player.deadTime = 0; this.deaths++;
    this.emit('death', this.player.x, this.player.y);
    this.burst(this.player.x, Math.min(this.player.y, 530), '#e7f0dc', 15, 110);
  }

  snapshot() {
    const p = this.player;
    return { level: this.index + 1, time: +this.elapsed.toFixed(2), player: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), vx: +p.vx.toFixed(2), vy: +p.vy.toFixed(2), grounded: p.grounded, dead: p.dead }, coins: this.collected.size, totalCoins: this.level.coins.length, checkpoint: this.checkpoint, deaths: this.deaths, finished: this.finished };
  }
}
