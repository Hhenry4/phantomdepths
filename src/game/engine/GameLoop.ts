import { GameState, Particle, SonarPing } from '../types';
import {
  SUB_THRUST, SUB_ROTATION_SPEED, SUB_DRAG, SUB_GRAVITY,
  SUB_MAX_SPEED, SONAR_COOLDOWN, SONAR_MAX_RADIUS, WORLD_WIDTH,
} from '../constants';
import { InputManager } from './Input';
import { generateTerrain, getZoneAtDepth, getZoneConfig } from './Terrain';
import { spawnCreaturesForDepth, updateCreature } from './Creatures';
import { render } from './Renderer';

export function createInitialState(): GameState {
  const terrain = generateTerrain();
  return {
    sub: {
      pos: { x: 0, y: 50 },
      vel: { x: 0, y: 0 },
      rotation: Math.PI / 2, // pointing down
      thrust: 0,
      hull: 100,
      power: 100,
      oxygen: 100,
      depth: 0,
      engineNoise: 0,
      lightOn: true,
      weapons: [
        { type: 'harpoon', ammo: 20, cooldown: 0 },
      ],
      sonarCooldown: 0,
      sonarActive: false,
    },
    creatures: [],
    terrain,
    particles: [],
    sonarPings: [],
    camera: { x: 0, y: 50 },
    worldWidth: WORLD_WIDTH,
    score: 0,
    time: 0,
    paused: false,
    gameOver: false,
    currentZone: 'sunlight',
    deepestDepth: 0,
    resources: {
      coral: 0,
      metal: 0,
      crystal: 0,
      organism: 0,
      artifact: 0,
    },
  };
}

export function updateGame(state: GameState, input: InputManager, dt: number): void {
  if (state.paused || state.gameOver) return;

  state.time += dt;
  const sub = state.sub;

  // Input handling
  let thrusting = false;
  if (input.isDown('w') || input.isDown('ArrowUp')) {
    sub.vel.x += Math.cos(sub.rotation) * SUB_THRUST;
    sub.vel.y += Math.sin(sub.rotation) * SUB_THRUST;
    thrusting = true;
  }
  if (input.isDown('s') || input.isDown('ArrowDown')) {
    sub.vel.x -= Math.cos(sub.rotation) * SUB_THRUST * 0.5;
    sub.vel.y -= Math.sin(sub.rotation) * SUB_THRUST * 0.5;
    thrusting = true;
  }
  if (input.isDown('a') || input.isDown('ArrowLeft')) {
    sub.rotation -= SUB_ROTATION_SPEED;
  }
  if (input.isDown('d') || input.isDown('ArrowRight')) {
    sub.rotation += SUB_ROTATION_SPEED;
  }

  // Toggle light
  if (input.wasPressed('f')) {
    sub.lightOn = !sub.lightOn;
  }

  // Sonar ping
  if (input.wasPressed('e') && sub.sonarCooldown <= 0) {
    state.sonarPings.push({
      origin: { ...sub.pos },
      radius: 0,
      maxRadius: SONAR_MAX_RADIUS,
      alpha: 1,
      echoReturned: false,
      echoRadius: 0,
    });
    sub.sonarCooldown = SONAR_COOLDOWN;
    sub.engineNoise = Math.min(sub.engineNoise + 0.3, 1);
  }

  // Weapon fire
  if (input.wasPressed(' ')) {
    const weapon = sub.weapons[0];
    if (weapon && weapon.ammo > 0 && weapon.cooldown <= 0) {
      weapon.ammo--;
      weapon.cooldown = 30;
      fireWeapon(state, weapon.type);
    }
  }

  // Physics
  sub.vel.y += SUB_GRAVITY; // gravity pulls down
  sub.vel.x *= SUB_DRAG;
  sub.vel.y *= SUB_DRAG;

  // Speed cap
  const speed = Math.sqrt(sub.vel.x ** 2 + sub.vel.y ** 2);
  if (speed > SUB_MAX_SPEED) {
    sub.vel.x = (sub.vel.x / speed) * SUB_MAX_SPEED;
    sub.vel.y = (sub.vel.y / speed) * SUB_MAX_SPEED;
  }

  sub.pos.x += sub.vel.x;
  sub.pos.y += sub.vel.y;

  // Keep above surface
  if (sub.pos.y < 0) {
    sub.pos.y = 0;
    sub.vel.y = 0;
  }

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
  sub.engineNoise = thrusting ? Math.min(sub.engineNoise + 0.02, 1) : Math.max(sub.engineNoise - 0.01, 0);
  sub.thrust = thrusting ? 1 : 0;

  // Resource drain
  sub.power = Math.max(0, sub.power - (sub.lightOn ? 0.008 : 0.003));
  sub.oxygen = Math.max(0, sub.oxygen - 0.005);

  // Pressure damage
  const zoneConfig = getZoneConfig(sub.depth);
  if (zoneConfig.pressureDamage > 0) {
    sub.hull = Math.max(0, sub.hull - zoneConfig.pressureDamage);
  }

  // Game over checks
  if (sub.hull <= 0 || sub.oxygen <= 0) {
    state.gameOver = true;
  }

  // Weapon cooldowns
  for (const w of sub.weapons) {
    if (w.cooldown > 0) w.cooldown--;
  }
  if (sub.sonarCooldown > 0) sub.sonarCooldown--;

  // Camera follow
  state.camera.x += (sub.pos.x - state.camera.x) * 0.08;
  state.camera.y += (sub.pos.y - state.camera.y) * 0.08;

  // Spawn creatures
  updateCreatureSpawning(state);

  // Update creatures
  for (const creature of state.creatures) {
    updateCreature(creature, sub.pos, dt, sub.engineNoise);

    // Collision with submarine
    const dx = creature.pos.x - sub.pos.x;
    const dy = creature.pos.y - sub.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < creature.size + 30 && creature.state === 'chase') {
      sub.hull -= creature.damage * 0.05;
      // Push back
      sub.vel.x -= (dx / dist) * 2;
      sub.vel.y -= (dy / dist) * 2;
    }
  }

  // Remove dead/distant creatures
  state.creatures = state.creatures.filter(c => {
    const dist = Math.sqrt((c.pos.x - sub.pos.x) ** 2 + (c.pos.y - sub.pos.y) ** 2);
    return c.health > 0 && dist < 1500;
  });

  // Update sonar pings
  state.sonarPings = state.sonarPings.filter(p => {
    p.radius += 5;
    p.alpha = 1 - p.radius / p.maxRadius;

    // Check if ping hits any creature for echo
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

    if (p.echoReturned) {
      p.echoRadius -= 3;
    }

    return p.alpha > 0;
  });

  // Particles
  updateParticles(state);

  // Spawn ambient particles
  if (Math.random() < 0.3) {
    spawnBubble(state);
  }
  if (sub.depth > 200 && Math.random() < 0.1) {
    spawnBiolum(state);
  }

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
        life: 40,
        maxLife: 40,
        size: 2 + Math.random() * 3,
        color: '#b4c5cf',
        alpha: 0.6,
        type: 'bubble',
      });
    }
  }

  input.clearFrame();
}

function updateCreatureSpawning(state: GameState) {
  // Spawn creatures in zones around the submarine
  if (state.time % 120 === 0) { // every 2 seconds at 60fps
    const newCreatures = spawnCreaturesForDepth(state.sub.depth, state.worldWidth);
    // Offset spawns to be off-screen
    for (const c of newCreatures) {
      c.pos.x += state.sub.pos.x;
      c.pos.y = state.sub.pos.y + (Math.random() - 0.5) * 600;
      c.patrolCenter = { ...c.pos };
    }
    state.creatures.push(...newCreatures);

    // Cap creature count
    if (state.creatures.length > 30) {
      state.creatures = state.creatures.slice(-30);
    }
  }
}

function fireWeapon(state: GameState, type: string) {
  const sub = state.sub;
  const projSpeed = 8;
  const projX = sub.pos.x + Math.cos(sub.rotation) * 35;
  const projY = sub.pos.y + Math.sin(sub.rotation) * 35;

  // Check creature hits along trajectory
  for (const creature of state.creatures) {
    const dx = creature.pos.x - projX;
    const dy = creature.pos.y - projY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Simple line check
    const dot = dx * Math.cos(sub.rotation) + dy * Math.sin(sub.rotation);
    if (dot > 0 && dot < 400) {
      const perpDist = Math.abs(dx * Math.sin(sub.rotation) - dy * Math.cos(sub.rotation));
      if (perpDist < creature.size + 10) {
        creature.health -= type === 'harpoon' ? 15 : 30;
        creature.vel.x += Math.cos(sub.rotation) * 3;
        creature.vel.y += Math.sin(sub.rotation) * 3;
        creature.stunTimer = 30;

        // Hit particles
        for (let i = 0; i < 5; i++) {
          state.particles.push({
            pos: { x: creature.pos.x, y: creature.pos.y },
            vel: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 },
            life: 20,
            maxLife: 20,
            size: 3,
            color: '#ff4500',
            alpha: 1,
            type: 'debris',
          });
        }
        break;
      }
    }
  }

  // Muzzle flash particles
  for (let i = 0; i < 3; i++) {
    state.particles.push({
      pos: { x: projX, y: projY },
      vel: {
        x: Math.cos(sub.rotation) * (projSpeed + Math.random() * 2),
        y: Math.sin(sub.rotation) * (projSpeed + Math.random() * 2),
      },
      life: 15,
      maxLife: 15,
      size: 2,
      color: '#ffaa00',
      alpha: 1,
      type: 'debris',
    });
  }
}

function updateParticles(state: GameState) {
  state.particles = state.particles.filter(p => {
    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;
    p.life--;
    if (p.type === 'bubble') {
      p.vel.y -= 0.02; // bubbles rise
      p.vel.x += (Math.random() - 0.5) * 0.1;
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
    life: 120,
    maxLife: 120,
    size: 1 + Math.random() * 2,
    color: '#b4c5cf',
    alpha: 0.3,
    type: 'bubble',
  });
}

function spawnBiolum(state: GameState) {
  state.particles.push({
    pos: {
      x: state.sub.pos.x + (Math.random() - 0.5) * 500,
      y: state.sub.pos.y + (Math.random() - 0.5) * 500,
    },
    vel: { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.2 },
    life: 200,
    maxLife: 200,
    size: 1 + Math.random() * 3,
    color: '#e0b0ff',
    alpha: 0.5 + Math.random() * 0.3,
    type: 'biolum',
  });
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number) {
  render(ctx, state, canvasW, canvasH);
}
