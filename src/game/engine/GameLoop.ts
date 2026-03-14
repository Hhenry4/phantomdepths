import { GameState, Projectile, Particle, PlayerProgress, WeaponType } from '../types';
import {
  SUB_THRUST, SUB_DRAG, SUB_GRAVITY, SUB_MAX_SPEED,
  SONAR_COOLDOWN, SONAR_MAX_RADIUS, WORLD_WIDTH,
  HARPOON_SPEED, HARPOON_RANGE, HARPOON_COOLDOWN, HARPOON_HIT_RADIUS,
  HARPOON_BASE_DAMAGE, BOSS_SPAWN_DEPTHS, COIN_VALUES, XP_PER_KILL,
  WEAPON_SHOP, TERRAIN_CHUNK_SIZE,
} from '../constants';
import { InputManager } from './Input';
import { generateTerrain, extendTerrain, getZoneAtDepth, getZoneConfig } from './Terrain';
import { spawnCreaturesForDepth, spawnBoss, updateCreature } from './Creatures';

export function applyUpgrades(progress: PlayerProgress): {
  maxHull: number; maxOxygen: number; maxPower: number;
  speed: number; harpoonDamage: number; maxAmmo: number;
  armorLevel: number; sonarLevel: number; fireRateBonus: number;
  projSpeedBonus: number; stealthBonus: number; regenLevel: number; lightLevel: number;
} {
  const u = progress.upgrades;
  return {
    maxHull: 100 + (u.hull || 0) * 30,
    maxOxygen: 100 + (u.oxygen || 0) * 30,
    maxPower: 100 + (u.power || 0) * 30,
    speed: 1 + (u.speed || 0) * 0.12,
    harpoonDamage: HARPOON_BASE_DAMAGE * (1 + (u.damage || 0) * 0.35),
    maxAmmo: 20 + (u.ammo || 0) * 8,
    armorLevel: u.armor || 0,
    sonarLevel: u.sonar || 0,
    fireRateBonus: (u.firerate || 0) * 0.15,
    projSpeedBonus: (u.projspeed || 0) * 0.2,
    stealthBonus: (u.stealth || 0) * 0.2,
    regenLevel: u.regen || 0,
    lightLevel: u.light || 0,
  };
}

let terrainSeed = Date.now();

export function createInitialState(progress?: PlayerProgress): GameState {
  terrainSeed = Date.now();

  const checkpoint = progress?.runCheckpoint;
  const checkpointDepth = Math.max(0, checkpoint?.depth ?? checkpoint?.position?.y ?? 0);
  const initialGenDepth = Math.max(2000, checkpointDepth + TERRAIN_CHUNK_SIZE);
  const terrain = generateTerrain(terrainSeed, initialGenDepth);

  const ups = progress ? applyUpgrades(progress) : {
    maxHull: 100, maxOxygen: 100, maxPower: 100,
    speed: 1, harpoonDamage: HARPOON_BASE_DAMAGE, maxAmmo: 20,
    armorLevel: 0, sonarLevel: 0, fireRateBonus: 0, projSpeedBonus: 0,
    stealthBonus: 0, regenLevel: 0, lightLevel: 0,
  };

  const weaponsOwned = progress?.weaponsOwned || ['harpoon'];
  const weapons = weaponsOwned.map(wType => {
    const shopItem = WEAPON_SHOP.find(w => w.type === wType);
    if (!shopItem) return { type: wType as WeaponType, ammo: 20, maxAmmo: 20, cooldown: 0 };
    const ammoBonus = wType === 'harpoon' ? (ups.maxAmmo - 20) : 0;
    return {
      type: wType as WeaponType,
      ammo: shopItem.ammo + ammoBonus,
      maxAmmo: shopItem.ammo + ammoBonus,
      cooldown: 0,
    };
  });

  const activeWeaponIndex = Math.max(0, weapons.findIndex(w => w.type === progress?.equippedWeapon));
  const startPos = checkpoint?.position ?? { x: 0, y: 50 };
  const startVel = checkpoint?.velocity ?? { x: 0, y: 0 };
  const startRotation = checkpoint?.rotation ?? Math.PI / 2;
  const startAim = checkpoint?.aimAngle ?? startRotation;

  return {
    sub: {
      pos: { ...startPos },
      vel: { ...startVel },
      rotation: startRotation,
      aimAngle: startAim,
      thrust: 0,
      hull: Math.min(ups.maxHull, Math.max(1, checkpoint?.hull ?? ups.maxHull)),
      maxHull: ups.maxHull,
      power: Math.min(ups.maxPower, Math.max(0, checkpoint?.power ?? ups.maxPower)),
      maxPower: ups.maxPower,
      oxygen: Math.min(ups.maxOxygen, Math.max(1, checkpoint?.oxygen ?? ups.maxOxygen)),
      maxOxygen: ups.maxOxygen,
      depth: checkpointDepth,
      engineNoise: 0,
      lightOn: true,
      weapons,
      activeWeaponIndex,
      sonarCooldown: 0,
      sonarActive: false,
      speed: ups.speed,
      harpoonDamage: ups.harpoonDamage,
    },
    creatures: [],
    terrain,
    particles: [],
    sonarPings: [],
    projectiles: [],
    camera: { x: startPos.x, y: Math.max(50, startPos.y) },
    worldWidth: WORLD_WIDTH,
    score: 0,
    coins: checkpoint?.coins ?? 0,
    xpEarned: checkpoint?.xpEarned ?? 0,
    time: 0,
    paused: false,
    gameOver: false,
    currentZone: getZoneAtDepth(checkpointDepth),
    deepestDepth: checkpointDepth,
    resources: { coral: 0, metal: 0, crystal: 0, organism: 0, artifact: 0 },
    killCount: checkpoint?.killCount ? { ...checkpoint.killCount } : {},
    bossesDefeated: checkpoint?.bossesDefeated ? [...checkpoint.bossesDefeated] : [],
    generatedDepth: initialGenDepth,
  };
}

let upgradeCache: ReturnType<typeof applyUpgrades> | null = null;

export function updateGame(state: GameState, input: InputManager, dt: number, progress?: PlayerProgress, canvasW?: number, canvasH?: number): void {
  if (state.paused || state.gameOver) return;

  if (progress && !upgradeCache) {
    upgradeCache = applyUpgrades(progress);
  }

  state.time += dt;
  const sub = state.sub;
  const ups = upgradeCache;

  // --- Infinite terrain generation ---
  if (sub.depth > state.generatedDepth - TERRAIN_CHUNK_SIZE) {
    state.generatedDepth = extendTerrain(
      state.terrain,
      state.generatedDepth,
      sub.depth + TERRAIN_CHUNK_SIZE * 2,
      terrainSeed
    );
  }

  // --- Mouse-based aiming ---
  if (canvasW && canvasH) {
    const screenCenterX = canvasW / 2;
    const screenCenterY = canvasH / 2;
    const dx = input.mouseX - screenCenterX;
    const dy = input.mouseY - screenCenterY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      sub.aimAngle = Math.atan2(dy, dx);
    }
  }

  // --- Direct WASD movement ---
  let thrusting = false;
  const thrustPower = SUB_THRUST * sub.speed;

  if (input.isDown('w') || input.isDown('ArrowUp')) { sub.vel.y -= thrustPower; thrusting = true; }
  if (input.isDown('s') || input.isDown('ArrowDown')) { sub.vel.y += thrustPower; thrusting = true; }
  if (input.isDown('a') || input.isDown('ArrowLeft')) { sub.vel.x -= thrustPower; thrusting = true; }
  if (input.isDown('d') || input.isDown('ArrowRight')) { sub.vel.x += thrustPower; thrusting = true; }

  // Rotation to face velocity (sub body follows movement)
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

  // Reload ammo (R key)
  if (input.wasPressed('r')) {
    const activeWeapon = sub.weapons[sub.activeWeaponIndex];
    if (activeWeapon && activeWeapon.ammo < activeWeapon.maxAmmo) {
      activeWeapon.ammo = activeWeapon.maxAmmo;
      // Reload costs power
      sub.power = Math.max(0, sub.power - 5);
    }
  }

  // Weapon switching
  if (input.wasPressed('q')) {
    sub.activeWeaponIndex = (sub.activeWeaponIndex + 1) % sub.weapons.length;
  }
  for (let i = 0; i < sub.weapons.length && i < 8; i++) {
    if (input.wasPressed(String(i + 1))) sub.activeWeaponIndex = i;
  }

  // Sonar ping
  if (input.wasPressed('e') && sub.sonarCooldown <= 0) {
    const sonarLevel = ups?.sonarLevel ?? 0;
    state.sonarPings.push({
      origin: { ...sub.pos },
      radius: 0,
      maxRadius: SONAR_MAX_RADIUS * (1 + sonarLevel * 0.25),
      alpha: 1,
      echoReturned: false,
      echoRadius: 0,
    });
    sub.sonarCooldown = SONAR_COOLDOWN * (1 - (ups?.sonarLevel ?? 0) * 0.15);
    sub.engineNoise = Math.min(sub.engineNoise + 0.3, 1);
  }

  // Weapon fire — uses aimAngle (mouse) for direction, fires on SPACE or left click
  const activeWeapon = sub.weapons[sub.activeWeaponIndex];
  const wantFire = input.isDown(' ') || input.wasPressed(' ') || input.mouseDown || input.mouseJustPressed;
  if (activeWeapon && wantFire && activeWeapon.ammo > 0 && activeWeapon.cooldown <= 0) {
    activeWeapon.ammo--;
    const fireRateMultiplier = 1 - (ups?.fireRateBonus ?? 0);
    const projSpeedMultiplier = 1 + (ups?.projSpeedBonus ?? 0);
    const fireAngle = sub.aimAngle;

    const projX = sub.pos.x + Math.cos(fireAngle) * 35;
    const projY = sub.pos.y + Math.sin(fireAngle) * 35;

    switch (activeWeapon.type) {
      case 'harpoon': {
        activeWeapon.cooldown = Math.floor(HARPOON_COOLDOWN * fireRateMultiplier);
        state.projectiles.push({
          pos: { x: projX, y: projY },
          vel: { x: Math.cos(fireAngle) * HARPOON_SPEED * projSpeedMultiplier, y: Math.sin(fireAngle) * HARPOON_SPEED * projSpeedMultiplier },
          life: HARPOON_RANGE / HARPOON_SPEED,
          damage: sub.harpoonDamage,
          type: 'harpoon',
        });
        break;
      }
      case 'shock': {
        activeWeapon.cooldown = Math.floor(45 * fireRateMultiplier);
        const shockRadius = 150;
        for (const c of state.creatures) {
          const cdx = c.pos.x - sub.pos.x;
          const cdy = c.pos.y - sub.pos.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cdist < shockRadius) {
            c.stunTimer = 60;
            c.health -= 8;
            c.vel.x += (cdx / (cdist || 1)) * 5;
            c.vel.y += (cdy / (cdist || 1)) * 5;
          }
        }
        for (let i = 0; i < 20; i++) {
          const angle = (Math.PI * 2 * i) / 20;
          state.particles.push({
            pos: { x: sub.pos.x, y: sub.pos.y },
            vel: { x: Math.cos(angle) * (3 + Math.random() * 3), y: Math.sin(angle) * (3 + Math.random() * 3) },
            life: 20, maxLife: 20, size: 2, color: '#6bb5ff', alpha: 1, type: 'electric',
          });
        }
        break;
      }
      case 'torpedo': {
        activeWeapon.cooldown = Math.floor(60 * fireRateMultiplier);
        state.projectiles.push({
          pos: { x: projX, y: projY },
          vel: { x: Math.cos(fireAngle) * 8 * projSpeedMultiplier, y: Math.sin(fireAngle) * 8 * projSpeedMultiplier },
          life: 80,
          damage: 80,
          type: 'torpedo',
          radius: 100,
        });
        break;
      }
      case 'plasma': {
        activeWeapon.cooldown = Math.floor(5 * fireRateMultiplier);
        state.projectiles.push({
          pos: { x: projX, y: projY },
          vel: { x: Math.cos(fireAngle) * 18 * projSpeedMultiplier, y: Math.sin(fireAngle) * 18 * projSpeedMultiplier },
          life: 15,
          damage: 12,
          type: 'plasma',
        });
        break;
      }
      case 'flak': {
        activeWeapon.cooldown = Math.floor(30 * fireRateMultiplier);
        for (let i = -2; i <= 2; i++) {
          const spread = fireAngle + i * 0.15;
          state.projectiles.push({
            pos: { x: projX, y: projY },
            vel: { x: Math.cos(spread) * 10 * projSpeedMultiplier, y: Math.sin(spread) * 10 * projSpeedMultiplier },
            life: 25,
            damage: 10,
            type: 'flak',
          });
        }
        break;
      }
      case 'cryo': {
        activeWeapon.cooldown = Math.floor(20 * fireRateMultiplier);
        state.projectiles.push({
          pos: { x: projX, y: projY },
          vel: { x: Math.cos(fireAngle) * 14 * projSpeedMultiplier, y: Math.sin(fireAngle) * 14 * projSpeedMultiplier },
          life: 35,
          damage: 15,
          type: 'cryo',
          special: 'freeze',
        });
        break;
      }
      case 'railgun': {
        activeWeapon.cooldown = Math.floor(80 * fireRateMultiplier);
        state.projectiles.push({
          pos: { x: projX, y: projY },
          vel: { x: Math.cos(fireAngle) * 30 * projSpeedMultiplier, y: Math.sin(fireAngle) * 30 * projSpeedMultiplier },
          life: 40,
          damage: 120,
          type: 'railgun',
          special: 'pierce',
        });
        break;
      }
      case 'vortex': {
        activeWeapon.cooldown = Math.floor(120 * fireRateMultiplier);
        state.projectiles.push({
          pos: { x: projX, y: projY },
          vel: { x: Math.cos(fireAngle) * 5, y: Math.sin(fireAngle) * 5 },
          life: 120,
          damage: 40,
          type: 'vortex',
          radius: 200,
          special: 'gravity',
        });
        break;
      }
    }

    // Muzzle flash
    for (let i = 0; i < 3; i++) {
      state.particles.push({
        pos: { x: projX, y: projY },
        vel: { x: Math.cos(fireAngle) * (4 + Math.random() * 2), y: Math.sin(fireAngle) * (4 + Math.random() * 2) },
        life: 12, maxLife: 12, size: 2, color: '#ffaa00', alpha: 1, type: 'debris',
      });
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
      sub.hull -= 1;
    }
    if (sub.pos.x > rightWall - 35) {
      sub.pos.x = rightWall - 35;
      sub.vel.x = -Math.abs(sub.vel.x) * 0.3;
      sub.hull -= 1;
    }
  }

  // Depth
  sub.depth = Math.max(0, sub.pos.y);
  state.currentZone = getZoneAtDepth(sub.depth);
  state.deepestDepth = Math.max(state.deepestDepth, sub.depth);

  // Engine noise
  const stealthMult = 1 - (ups?.stealthBonus ?? 0);
  sub.engineNoise = thrusting
    ? Math.min(sub.engineNoise + 0.02 * stealthMult, 1)
    : Math.max(sub.engineNoise - 0.01, 0);
  sub.thrust = thrusting ? 1 : 0;

  // Resource drain
  sub.power = Math.max(0, sub.power - (sub.lightOn ? 0.008 : 0.003));
  sub.oxygen = Math.max(0, sub.oxygen - 0.006);

  // Hull regen
  if (ups && ups.regenLevel > 0 && sub.hull < sub.maxHull) {
    sub.hull = Math.min(sub.maxHull, sub.hull + 0.003 * ups.regenLevel);
  }

  // Pressure damage
  const zoneConfig = getZoneConfig(sub.depth);
  if (zoneConfig.pressureDamage > 0) {
    const armorReduction = 1 - (ups?.armorLevel ?? 0) * 0.25;
    sub.hull = Math.max(0, sub.hull - zoneConfig.pressureDamage * Math.max(0.1, armorReduction));
  }

  if (sub.power <= 0) sub.lightOn = false;

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

  // --- Chest collection ---
  for (const feature of state.terrain.features) {
    if (feature.type === 'chest' && !feature.collected) {
      const dx = feature.pos.x - sub.pos.x;
      const dy = feature.pos.y - sub.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 40) {
        feature.collected = true;
        const value = feature.coinsValue || 10;
        state.coins += value;
        state.score += value * 5;
        // Coin particles
        for (let i = 0; i < 8; i++) {
          state.particles.push({
            pos: { x: feature.pos.x, y: feature.pos.y },
            vel: { x: (Math.random() - 0.5) * 4, y: -1 - Math.random() * 3 },
            life: 50, maxLife: 50, size: 3,
            color: '#ffd700', alpha: 1, type: 'coin',
          });
        }
      }
    }
  }

  // --- Projectile updates ---
  state.projectiles = state.projectiles.filter(proj => {
    proj.pos.x += proj.vel.x;
    proj.pos.y += proj.vel.y;
    proj.life--;

    // Vortex special: pull enemies
    if (proj.special === 'gravity' && proj.life > 0) {
      const vortexRadius = proj.radius || 200;
      for (const c of state.creatures) {
        const dx = proj.pos.x - c.pos.x;
        const dy = proj.pos.y - c.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < vortexRadius && dist > 10) {
          const pull = 0.3;
          c.vel.x += (dx / dist) * pull;
          c.vel.y += (dy / dist) * pull;
          if (state.time % 10 === 0) {
            c.health -= 5;
          }
        }
      }
      // Slow down vortex
      proj.vel.x *= 0.95;
      proj.vel.y *= 0.95;
    }

    let hit = false;
    for (const creature of state.creatures) {
      const dx = creature.pos.x - proj.pos.x;
      const dy = creature.pos.y - proj.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = proj.type === 'torpedo' ? 30 : HARPOON_HIT_RADIUS;

      if (dist < creature.size + hitRadius) {
        creature.health -= proj.damage;
        creature.vel.x += proj.vel.x * 0.3;
        creature.vel.y += proj.vel.y * 0.3;

        // Special effects
        if (proj.special === 'freeze') {
          creature.stunTimer = 150; // Long freeze
          creature.speed *= 0.2; // Slow
        } else if (proj.type === 'shock') {
          creature.stunTimer = 40;
        } else {
          creature.stunTimer = 15;
        }

        // Torpedo explosion
        if (proj.type === 'torpedo') {
          const explosionRadius = proj.radius || 100;
          for (const other of state.creatures) {
            if (other === creature) continue;
            const odx = other.pos.x - proj.pos.x;
            const ody = other.pos.y - proj.pos.y;
            const odist = Math.sqrt(odx * odx + ody * ody);
            if (odist < explosionRadius) {
              other.health -= proj.damage * 0.5;
              other.vel.x += (odx / (odist || 1)) * 8;
              other.vel.y += (ody / (odist || 1)) * 8;
              other.stunTimer = 20;
            }
          }
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            state.particles.push({
              pos: { x: proj.pos.x, y: proj.pos.y },
              vel: { x: Math.cos(angle) * (3 + Math.random() * 5), y: Math.sin(angle) * (3 + Math.random() * 5) },
              life: 30, maxLife: 30, size: 3 + Math.random() * 4,
              color: '#ff6600', alpha: 1, type: 'explosion',
            });
          }
        }

        // Hit particles
        for (let i = 0; i < 5; i++) {
          state.particles.push({
            pos: { x: proj.pos.x, y: proj.pos.y },
            vel: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 },
            life: 20, maxLife: 20, size: 3,
            color: proj.type === 'plasma' ? '#e0b0ff' : proj.type === 'cryo' ? '#88ddff' : '#ff4500', alpha: 1, type: 'debris',
          });
        }

        // Check kill
        if (creature.health <= 0) {
          const coinValue = COIN_VALUES[creature.type] || 5;
          const bonus = creature.isBoss ? coinValue * 4 : 0;
          state.coins += coinValue + bonus;
          state.score += coinValue * 10;
          state.xpEarned += XP_PER_KILL[creature.type] || 10;
          state.killCount[creature.type] = (state.killCount[creature.type] || 0) + 1;
          if (creature.isBoss) {
            state.bossesDefeated.push(`${creature.zone}_boss`);
          }
          for (let i = 0; i < 12; i++) {
            state.particles.push({
              pos: { x: creature.pos.x, y: creature.pos.y },
              vel: { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 },
              life: 50, maxLife: 50, size: 2 + Math.random() * 4,
              color: creature.glowColor, alpha: 0.8, type: 'debris',
            });
          }
          state.particles.push({
            pos: { x: creature.pos.x, y: creature.pos.y },
            vel: { x: 0, y: -1 },
            life: 60, maxLife: 60, size: 6,
            color: '#ffd700', alpha: 1, type: 'coin',
          });
        }

        // Railgun pierces through
        if (proj.special === 'pierce') {
          continue; // Don't remove projectile
        }
        hit = true;
        break;
      }
    }

    if (hit) return false;
    return proj.life > 0;
  });

  // Spawn creatures
  updateCreatureSpawning(state);

  // Update creatures
  for (const creature of state.creatures) {
    updateCreature(creature, sub.pos, dt, sub.engineNoise);

    // Collision with submarine
    const dx = creature.pos.x - sub.pos.x;
    const dy = creature.pos.y - sub.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < creature.size + 30 && creature.damage > 0 && creature.attackCooldown <= 0) {
      const shouldAttack = creature.state === 'chase' || creature.state === 'charge' || creature.type === 'jellyfish';
      if (shouldAttack) {
        const dmgMult = creature.state === 'charge' ? 1.5 : 1;
        sub.hull -= creature.damage * dmgMult;
        creature.attackCooldown = 25;
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        sub.vel.x -= nx * 4;
        sub.vel.y -= ny * 4;
        for (let i = 0; i < 5; i++) {
          state.particles.push({
            pos: { x: sub.pos.x + (Math.random() - 0.5) * 30, y: sub.pos.y + (Math.random() - 0.5) * 20 },
            vel: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 },
            life: 15, maxLife: 15, size: 4,
            color: '#ff0000', alpha: 1, type: 'debris',
          });
        }
      }
    }
  }

  // Remove dead/distant
  state.creatures = state.creatures.filter(c => {
    const dist = Math.sqrt((c.pos.x - sub.pos.x) ** 2 + (c.pos.y - sub.pos.y) ** 2);
    return c.health > 0 && dist < 2500;
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
  upgradeCache = null;
}

function updateCreatureSpawning(state: GameState) {
  // Reduced spawn frequency for less mob overload
  if (state.time % 150 === 0) {
    const newCreatures = spawnCreaturesForDepth(state.sub.depth, state.worldWidth);
    for (const c of newCreatures) {
      c.pos.x += state.sub.pos.x;
      c.pos.y = state.sub.pos.y + (Math.random() - 0.5) * 800;
      c.patrolCenter = { ...c.pos };
    }
    state.creatures.push(...newCreatures);
    // Cap creatures
    if (state.creatures.length > 25) {
      // Keep bosses, remove oldest non-bosses
      const bosses = state.creatures.filter(c => c.isBoss);
      const nonBosses = state.creatures.filter(c => !c.isBoss).slice(-20);
      state.creatures = [...bosses, ...nonBosses];
    }
  }

  for (const bossDepth of BOSS_SPAWN_DEPTHS) {
    if (!bossSpawned.has(bossDepth) && Math.abs(state.sub.depth - bossDepth) < 50) {
      const boss = spawnBoss(bossDepth, state.worldWidth);
      if (boss) {
        boss.pos.x = state.sub.pos.x + (Math.random() > 0.5 ? 400 : -400);
        boss.pos.y = bossDepth;
        boss.patrolCenter = { ...boss.pos };
        state.creatures.push(boss);
        bossSpawned.add(bossDepth);
      }
    }
  }

  // Additional bosses every 2000m after 8000m in infinite mode
  const nextBossDepth = Math.floor(state.sub.depth / 2000) * 2000;
  if (nextBossDepth >= 8000 && !bossSpawned.has(nextBossDepth) && Math.abs(state.sub.depth - nextBossDepth) < 50) {
    const boss = spawnBoss(nextBossDepth, state.worldWidth);
    if (boss) {
      boss.pos.x = state.sub.pos.x + (Math.random() > 0.5 ? 400 : -400);
      boss.pos.y = nextBossDepth;
      boss.patrolCenter = { ...boss.pos };
      // Scale boss health with depth
      const scaleFactor = 1 + (nextBossDepth - 6000) / 4000;
      boss.health *= scaleFactor;
      boss.maxHealth *= scaleFactor;
      boss.damage *= scaleFactor;
      state.creatures.push(boss);
      bossSpawned.add(nextBossDepth);
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
    if (p.type === 'electric') {
      p.vel.x *= 0.9;
      p.vel.y *= 0.9;
    }
    if (p.type === 'explosion') {
      p.vel.x *= 0.95;
      p.vel.y *= 0.95;
      p.size *= 0.97;
    }
    return p.life > 0;
  });
}

function spawnBubble(state: GameState) {
  state.particles.push({
    pos: {
      x: state.sub.pos.x + (Math.random() - 0.5) * 500,
      y: state.sub.pos.y + (Math.random() - 0.5) * 500,
    },
    vel: { x: (Math.random() - 0.5) * 0.3, y: -0.3 - Math.random() * 0.5 },
    life: 120, maxLife: 120, size: 1 + Math.random() * 2,
    color: '#b4c5cf', alpha: 0.3, type: 'bubble',
  });
}

function spawnBiolum(state: GameState) {
  state.particles.push({
    pos: {
      x: state.sub.pos.x + (Math.random() - 0.5) * 600,
      y: state.sub.pos.y + (Math.random() - 0.5) * 600,
    },
    vel: { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.2 },
    life: 200, maxLife: 200, size: 1 + Math.random() * 3,
    color: '#e0b0ff', alpha: 0.5 + Math.random() * 0.3, type: 'biolum',
  });
}
