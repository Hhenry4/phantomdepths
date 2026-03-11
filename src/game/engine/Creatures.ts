import { Creature, Vec2, CreatureType, DepthZone } from '../types';
import { CREATURE_CONFIGS, DEPTH_ZONES, BOSS_SPAWN_DEPTHS } from '../constants';
import { getZoneAtDepth } from './Terrain';

let creatureIdCounter = 0;

export function spawnCreature(type: CreatureType, pos: Vec2, zone: DepthZone, isBoss = false): Creature {
  const config = CREATURE_CONFIGS[type];
  const bossMultiplier = isBoss ? 3 : 1;
  return {
    id: `creature_${creatureIdCounter++}`,
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    type,
    health: config.health * bossMultiplier,
    maxHealth: config.health * bossMultiplier,
    state: 'patrol',
    stunTimer: 0,
    detectionRadius: config.detectionRadius * (isBoss ? 1.5 : 1),
    speed: config.speed * (isBoss ? 0.8 : 1),
    size: config.size * (isBoss ? 2 : 1),
    patrolCenter: { ...pos },
    patrolRadius: isBoss ? 150 : 80 + Math.random() * 120,
    patrolAngle: Math.random() * Math.PI * 2,
    zone,
    color: config.color,
    glowColor: config.glowColor,
    damage: config.damage * bossMultiplier,
    isBoss,
    attackCooldown: 0,
  };
}

export function spawnBoss(depth: number, worldWidth: number): Creature | null {
  const zone = getZoneAtDepth(depth);
  const bossTypes: Record<string, CreatureType> = {
    twilight: 'angler',
    midnight: 'squid',
    abyssal: 'serpent',
    hadal: 'leviathan',
  };
  const type = bossTypes[zone];
  if (!type) return null;
  return spawnCreature(type, { x: 0, y: depth }, zone, true);
}

export function spawnCreaturesForDepth(depth: number, worldWidth: number): Creature[] {
  const zone = getZoneAtDepth(depth);
  const zoneConfig = DEPTH_ZONES.find(z => z.zone === zone);
  if (!zoneConfig) return [];

  const creatures: Creature[] = [];
  const count = Math.floor(zoneConfig.creatureDensity * 3) + (Math.random() < zoneConfig.creatureDensity ? 1 : 0);

  for (let i = 0; i < count; i++) {
    const type = zoneConfig.creatureTypes[Math.floor(Math.random() * zoneConfig.creatureTypes.length)];
    const x = (Math.random() - 0.5) * worldWidth * 0.7;
    const y = depth + Math.random() * 200;
    creatures.push(spawnCreature(type, { x, y }, zone));
  }

  return creatures;
}

export function updateCreature(creature: Creature, subPos: Vec2, dt: number, engineNoise: number): void {
  if (creature.attackCooldown > 0) creature.attackCooldown -= dt;

  if (creature.stunTimer > 0) {
    creature.stunTimer -= dt;
    creature.state = 'stunned';
    creature.vel.x *= 0.95;
    creature.vel.y *= 0.95;
    creature.pos.x += creature.vel.x;
    creature.pos.y += creature.vel.y;
    return;
  }

  const dx = subPos.x - creature.pos.x;
  const dy = subPos.y - creature.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const effectiveDetection = creature.detectionRadius * (1 + engineNoise);

  // State transitions
  if (creature.type === 'fish') {
    creature.state = dist < effectiveDetection * 0.5 ? 'flee' : 'patrol';
  } else if (creature.type === 'jellyfish') {
    creature.state = 'patrol'; // jellyfish just drift but hurt on contact
  } else {
    creature.state = dist < effectiveDetection ? 'chase' : 'patrol';
  }

  // Boss creatures are more aggressive
  if (creature.isBoss && dist < effectiveDetection * 1.5) {
    creature.state = 'chase';
  }

  const chaseSpeed = creature.isBoss ? 0.08 : 0.05;

  switch (creature.state) {
    case 'chase': {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      creature.vel.x += nx * creature.speed * chaseSpeed;
      creature.vel.y += ny * creature.speed * chaseSpeed;
      break;
    }
    case 'flee': {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      creature.vel.x -= nx * creature.speed * 0.08;
      creature.vel.y -= ny * creature.speed * 0.08;
      break;
    }
    case 'patrol': {
      creature.patrolAngle += 0.01 + Math.random() * 0.01;
      const targetX = creature.patrolCenter.x + Math.cos(creature.patrolAngle) * creature.patrolRadius;
      const targetY = creature.patrolCenter.y + Math.sin(creature.patrolAngle) * creature.patrolRadius;
      const pdx = targetX - creature.pos.x;
      const pdy = targetY - creature.pos.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      creature.vel.x += (pdx / (pdist || 1)) * creature.speed * 0.02;
      creature.vel.y += (pdy / (pdist || 1)) * creature.speed * 0.02;
      break;
    }
  }

  const speed = Math.sqrt(creature.vel.x ** 2 + creature.vel.y ** 2);
  if (speed > creature.speed) {
    creature.vel.x = (creature.vel.x / speed) * creature.speed;
    creature.vel.y = (creature.vel.y / speed) * creature.speed;
  }

  creature.vel.x *= 0.98;
  creature.vel.y *= 0.98;
  creature.pos.x += creature.vel.x;
  creature.pos.y += creature.vel.y;
}
