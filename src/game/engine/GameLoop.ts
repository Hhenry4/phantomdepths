import { GameState, Projectile, Particle, SonarPing, PlayerProgress } from '../types';
import {
  SUB_THRUST, SUB_DRAG, SUB_GRAVITY, SUB_MAX_SPEED,
  SONAR_COOLDOWN, SONAR_MAX_RADIUS, WORLD_WIDTH,
  HARPOON_SPEED, HARPOON_RANGE, HARPOON_COOLDOWN, HARPOON_HIT_RADIUS,
  HARPOON_BASE_DAMAGE, BOSS_SPAWN_DEPTHS, COIN_VALUES,
} from '../constants';
import { InputManager } from './Input';
import { generateTerrain, getZoneAtDepth, getZoneConfig } from './Terrain';
import { spawnCreaturesForDepth, spawnBoss, updateCreature } from './Creatures';

export function applyUpgrades(progress: PlayerProgress): Partial<{
  maxHull: number; maxOxygen: number; maxPower: number;
  speed: number; harpoonDamage: number; maxAmmo: number;
  armorLevel: number; sonarLevel: number;
}> {
  const u = progress.upgrades;
  return {
    maxHull: 100 + (u.hull || 0) * 25,
    maxOxygen: 100 + (u.oxygen || 0) * 25,
    maxPower: 100 + (u.power || 0) * 25,
    speed: 1 + (u.speed || 0) * 0.15,
    harpoonDamage: HARPOON_BASE_DAMAGE * (1 + (u.damage || 0) * 0.4),
    maxAmmo: 20 + (u.ammo || 0) * 10,
    armorLevel: u.armor || 0,
    sonarLevel: u.sonar || 0,
  };
}

export function createInitialState(progress?: PlayerProgress): GameState {
  const terrain = generateTerrain();
  const ups = progress ? applyUpgrades(progress) : {
    maxHull: 100, maxOxygen: 100, maxPower: 100,
    speed: 1, harpoonDamage: HARPOON_BASE_DAMAGE, maxAmmo: 20,
    armorLevel: 0, sonarLevel: 0,
  };

  return {
    sub: {
      pos: { x: 0, y: 50 },
      vel: { x: 0, y: 0 },
      rotation: Math.PI / 2,
      thrust: 0,
      hull: ups.maxHull!,
      maxHull: ups.maxHull!,
      power: ups.maxPower!,
      maxPower: ups.maxPower!,
      oxygen: ups.maxOxygen!,
      maxOxygen: ups.maxOxygen!,
      depth: 0,
      engineNoise: 0,
      lightOn: true,
      weapons: [{ type: 'harpoon', ammo: ups.maxAmmo!, maxAmmo: ups.maxAmmo!, cooldown: 0 }],
      sonarCooldown: 0,
      sonarActive: false,
      speed: ups.speed!,
      harpoonDamage: ups.harpoonDamage!,
    },
    creatures: [],
    terrain,
    particles: [],
    sonarPings: [],
    projectiles: [],
    camera: { x: 0, y: 50 },
    worldWidth: WORLD_WIDTH,
    score: 0,
    coins: 0,
    time: 0,
    paused: false,
    gameOver: false,
    currentZone: 'sunlight',
    deepestDepth: 0,
    resources: { coral: 0, metal: 0, crystal: 0, organism: 0, artifact: 0 },
    killCount: {},
    bossesDefeated: [],
  };
}

export function updateGame(state: GameState, input: InputManager, dt: number): void {
  if (state.paused || state.gameOver) return;

  state.time += dt;
  const sub = state.sub;

  // --- Direct WASD movement (no rotation) ---
  let thrusting = false;
  const thrustPower = SUB_THRUST * sub.speed;

  if (input.isDown('w') || input.isDown('ArrowUp')) {
    sub.vel.y -= thrustPower;
    thrusting = true;
  }
  if (input.isDown('s') || input.isDown('ArrowDown')) {
    sub.vel.y += thrustPower;
    thrusting = true;
  }
  if (input.isDown('a') || input.isDown('ArrowLeft')) {
    sub.vel.x -= thrustPower;
    thrusting = true;
  }
  if (input.isDown('d') || input.isDown('ArrowRight')) {
    sub.vel.x += thrustPower;
    thrusting = true;
  }

  // Update rotation to face velocity direction
  const speed = Math.sqrt(sub.vel.x ** 2 + sub.vel.y ** 2);
  if (speed > 0.3) {
    const targetRot = Math.atan2(sub.vel.y, sub.vel.x);
    let diff = targetRot - sub.rotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    sub.rotation += diff * 0.1;
  }

  // Toggle light
  if (input.wasPressed('f')) sub.lightOn = !sub.lightOn;

  // Sonar ping
  if (input.wasPressed('e') && sub.sonarCooldown <= 0) {
    const sonarLevel = 0; // Will be passed via upgrades later
    state.sonarPings.push({
      origin: { ...sub.pos },
      radius: 0,
      maxRadius: SONAR_MAX_RADIUS * (1 + sonarLevel * 0.3),
      alpha: 1,
      echoReturned: false,
      echoRadius: 0,
    });
    sub.sonarCooldown = SONAR_COOLDOWN * (1 - sonarLevel * 0.2);
    sub.engineNoise = Math.min(sub.engineNoise + 0.3, 1);
  }

  // Weapon fire - fires in facing direction
  if ((input.isDown(' ') || input.wasPressed(' ')) && sub.weapons[0]) {
    const weapon = sub.weapons[0];
    if (weapon.ammo > 0 && weapon.cooldown <= 0) {
      weapon.ammo--;
      weapon.cooldown = HARPOON_COOLDOWN;
      const projX = sub.pos.x + Math.cos(sub.rotation) * 35;
      const projY = sub.pos.y + Math.sin(sub.rotation) * 35;
      state.projectiles.push({
        pos: { x: projX, y: projY },
        vel: {
          x: Math.cos(sub.rotation) * HARPOON_SPEED,
          y: Math.sin(sub.rotation) * HARPOON_SPEED,
        },
        life: HARPOON_RANGE / HARPOON_SPEED,
        damage: sub.harpoonDamage,
        type: 'harpoon',
      });
      // Muzzle flash
      for (let i = 0; i < 3; i++) {
        state.particles.push({
          pos: { x: projX, y: projY },
          vel: {
            x: Math.cos(sub.rotation) * (HARPOON_SPEED * 0.5 + Math.random() * 2),
            y: Math.sin(sub.rotation) * (HARPOON_SPEED * 0.5 + Math.random() * 2),
          },
          life: 12, maxLife: 12, size: 2,
          color: '#ffaa00', alpha: 1, type: 'debris',
        });
      }
    }
  }

  // Physics
  sub.vel.y += SUB_GRAVITY;
  sub.vel.x *= SUB_DRAG;
  sub.vel.y *= SUB_DRAG;

  const currentSpeed = Math.sqrt(sub.vel.x ** 2 + sub.vel.y ** 2);
  const maxSpd = SUB_MAX_SPEED * sub.speed;
  if (currentSpeed > maxSpd) {
    sub.vel.x = (sub.vel.x / currentSpeed) * maxSpd;
    sub.vel.y = (sub.vel.y / currentSpeed) * maxSpd;
  }

  sub.pos.x += sub.vel.x;
  sub.pos.y += sub.vel.y;

  if (sub.pos.y < 0) { sub.pos.y = 0; sub.vel.y = 0; }

  // Terrain collision
  const terrainIdx = Math.floor(sub.pos.y / 20);
  if (terrainIdx >= 0 && terrainIdx < state.terrain.left.length) {
    const leftWall = state.terrain.left[terrainIdx].x;
    const rightWall = state.terrain.right[terrainIdx].x;
    if (sub.pos.x < leftWall + 35) {
      sub.pos.x = leftWall + 35;
      sub.vel.x = Math.abs(sub.vel.x) * 0.3;
      sub.hull -= 0.5;
    }
    if (sub.pos.x > rightWall - 35) {
      sub.pos.x = rightWall - 35;
      sub.vel.x = -Math.abs(sub.vel.x) * 0.3;
      sub.hull -= 0.5;
    }
  }

  // Depth
  sub.depth = Math.max(0, sub.pos.y);
  state.currentZone = getZoneAtDepth(sub.depth);
  state.deepestDepth = Math.max(state.deepestDepth, sub.depth);

  // Engine noise
  sub.engineNoise = thrusting ? Math.min(sub.engineNoise + 0.02, 1) : Math.max(sub.engineNoise - 0.01, 0);
  sub.thrust = thrusting ? 1 : 0;

  // Resource drain (much slower)
  sub.power = Math.max(0, sub.power - (sub.lightOn ? 0.003 : 0.001));
  sub.oxygen = Math.max(0, sub.oxygen - 0.002);

  // Pressure damage (reduced by armor upgrade)
  const zoneConfig = getZoneConfig(sub.depth);
  if (zoneConfig.pressureDamage > 0) {
    sub.hull = Math.max(0, sub.hull - zoneConfig.pressureDamage);
  }

  // Game over
  if (sub.hull <= 0 || sub.oxygen <= 0) {
    state.gameOver = true;
  }

  // Cooldowns
  for (const w of sub.weapons) {
    if (w.cooldown > 0) w.cooldown--;
  }
  if (sub.sonarCooldown > 0) sub.sonarCooldown--;

  // Camera
  state.camera.x += (sub.pos.x - state.camera.x) * 0.08;
  state.camera.y += (sub.pos.y - state.camera.y) * 0.08;

  // --- Projectile updates ---
  state.projectiles = state.projectiles.filter(proj => {
    proj.pos.x += proj.vel.x;
    proj.pos.y += proj.vel.y;
    proj.life--;

    // Check creature hits
    for (const creature of state.creatures) {
      const dx = creature.pos.x - proj.pos.x;
      const dy = creature.pos.y - proj.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < creature.size + HARPOON_HIT_RADIUS) {
        creature.health -= proj.damage;
        creature.vel.x += proj.vel.x * 0.3;
        creature.vel.y += proj.vel.y * 0.3;
        creature.stunTimer = 20;

        // Hit particles
        for (let i = 0; i < 5; i++) {
          state.particles.push({
            pos: { x: proj.pos.x, y: proj.pos.y },
            vel: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 },
            life: 20, maxLife: 20, size: 3,
            color: '#ff4500', alpha: 1, type: 'debris',
          });
        }

        // Check kill
        if (creature.health <= 0) {
          const coinValue = COIN_VALUES[creature.type] || 5;
          const bonus = creature.isBoss ? coinValue * 3 : 0;
          state.coins += coinValue + bonus;
          state.score += coinValue * 10;
          state.killCount[creature.type] = (state.killCount[creature.type] || 0) + 1;
          if (creature.isBoss) {
            state.bossesDefeated.push(`${creature.zone}_boss`);
          }
          // Death particles
          for (let i = 0; i < 10; i++) {
            state.particles.push({
              pos: { x: creature.pos.x, y: creature.pos.y },
              vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 },
              life: 40, maxLife: 40, size: 2 + Math.random() * 3,
              color: creature.glowColor, alpha: 0.8, type: 'debris',
            });
          }
          // Coin particle
          state.particles.push({
            pos: { x: creature.pos.x, y: creature.pos.y },
            vel: { x: 0, y: -1 },
            life: 60, maxLife: 60, size: 6,
            color: '#ffd700', alpha: 1, type: 'coin',
          });
        }

        return false; // destroy projectile
      }
    }
    return proj.life > 0;
  });

  // Spawn creatures
  updateCreatureSpawning(state);

  // Update creatures
  for (const creature of state.creatures) {
    updateCreature(creature, sub.pos, dt, sub.engineNoise);

    // Collision with submarine - ACTUALLY DAMAGING
    const dx = creature.pos.x - sub.pos.x;
    const dy = creature.pos.y - sub.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < creature.size + 30 && creature.damage > 0 && creature.attackCooldown <= 0) {
      if (creature.state === 'chase' || creature.type === 'jellyfish') {
        sub.hull -= creature.damage;
        creature.attackCooldown = 30; // ~0.5s between attacks
        // Knockback
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        sub.vel.x -= nx * 3;
        sub.vel.y -= ny * 3;
        // Damage flash particles
        for (let i = 0; i < 4; i++) {
          state.particles.push({
            pos: { x: sub.pos.x + (Math.random() - 0.5) * 30, y: sub.pos.y + (Math.random() - 0.5) * 20 },
            vel: { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 },
            life: 15, maxLife: 15, size: 4,
            color: '#ff0000', alpha: 1, type: 'debris',
          });
        }
      }
    }
  }

  // Remove dead/distant creatures
  state.creatures = state.creatures.filter(c => {
    const dist = Math.sqrt((c.pos.x - sub.pos.x) ** 2 + (c.pos.y - sub.pos.y) ** 2);
    return c.health > 0 && dist < 2000;
  });

  // Sonar pings
  state.sonarPings = state.sonarPings.filter(p => {
    p.radius += 5;
    p.alpha = 1 - p.radius / p.maxRadius;
    if (!p.echoReturned) {
      for (const c of state.creatures) {
        const dist = Math.sqrt((c.pos.x - p.origin.x) ** 2 + (c.pos.y - p.origin.y) ** 2);
        if (Math.abs(dist - p.radius) < 20 && c.size > 30) {
          p.echoReturned = true;
          p.echoRadius = p.radius;
          break;
        }
      }
    }
    if (p.echoReturned) p.echoRadius -= 3;
    return p.alpha > 0;
  });

  // Particles
  updateParticles(state);
  if (Math.random() < 0.3) spawnBubble(state);
  if (sub.depth > 200 && Math.random() < 0.1) spawnBiolum(state);

  // Thrust bubbles
  if (thrusting) {
    for (let i = 0; i < 2; i++) {
      state.particles.push({
        pos: {
          x: sub.pos.x - Math.cos(sub.rotation) * 30 + (Math.random() - 0.5) * 10,
          y: sub.pos.y - Math.sin(sub.rotation) * 30 + (Math.random() - 0.5) * 10,
        },
        vel: {
          x: -Math.cos(sub.rotation) * 2 + (Math.random() - 0.5),
          y: -Math.sin(sub.rotation) * 2 + (Math.random() - 0.5) - 0.5,
        },
        life: 40, maxLife: 40, size: 2 + Math.random() * 3,
        color: '#b4c5cf', alpha: 0.6, type: 'bubble',
      });
    }
  }

  input.clearFrame();
}

let bossSpawned: Set<number> = new Set();

export function resetBossTracker() {
  bossSpawned = new Set();
}

function updateCreatureSpawning(state: GameState) {
  // Regular spawning
  if (state.time % 120 === 0) {
    const newCreatures = spawnCreaturesForDepth(state.sub.depth, state.worldWidth);
    for (const c of newCreatures) {
      c.pos.x += state.sub.pos.x;
      c.pos.y = state.sub.pos.y + (Math.random() - 0.5) * 600;
      c.patrolCenter = { ...c.pos };
    }
    state.creatures.push(...newCreatures);
    if (state.creatures.length > 40) {
      state.creatures = state.creatures.slice(-40);
    }
  }

  // Boss spawning at zone boundaries
  for (const bossDepth of BOSS_SPAWN_DEPTHS) {
    if (!bossSpawned.has(bossDepth) && Math.abs(state.sub.depth - bossDepth) < 50) {
      const boss = spawnBoss(bossDepth, state.worldWidth);
      if (boss) {
        boss.pos.x = state.sub.pos.x + (Math.random() > 0.5 ? 300 : -300);
        boss.pos.y = bossDepth;
        boss.patrolCenter = { ...boss.pos };
        state.creatures.push(boss);
        bossSpawned.add(bossDepth);
      }
    }
  }
}

function updateParticles(state: GameState) {
  state.particles = state.particles.filter(p => {
    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;
    p.life--;
    if (p.type === 'bubble') {
      p.vel.y -= 0.02;
      p.vel.x += (Math.random() - 0.5) * 0.1;
    }
    if (p.type === 'coin') {
      p.vel.y -= 0.02;
      p.alpha = p.life / p.maxLife;
    }
    return p.life > 0;
  });
}

function spawnBubble(state: GameState) {
  state.particles.push({
    pos: {
      x: state.sub.pos.x + (Math.random() - 0.5) * 400,
      y: state.sub.pos.y + (Math.random() - 0.5) * 400,
    },
    vel: { x: (Math.random() - 0.5) * 0.3, y: -0.3 - Math.random() * 0.5 },
    life: 120, maxLife: 120, size: 1 + Math.random() * 2,
    color: '#b4c5cf', alpha: 0.3, type: 'bubble',
  });
}

function spawnBiolum(state: GameState) {
  state.particles.push({
    pos: {
      x: state.sub.pos.x + (Math.random() - 0.5) * 500,
      y: state.sub.pos.y + (Math.random() - 0.5) * 500,
    },
    vel: { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.2 },
    life: 200, maxLife: 200, size: 1 + Math.random() * 3,
    color: '#e0b0ff', alpha: 0.5 + Math.random() * 0.3, type: 'biolum',
  });
}


