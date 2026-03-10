import { Creature, Vec2, CreatureType, DepthZone } from '../types';
import { CREATURE_CONFIGS, DEPTH_ZONES } from '../constants';
import { getZoneAtDepth } from './Terrain';

let creatureIdCounter = 0;

export function spawnCreature(type: CreatureType, pos: Vec2, zone: DepthZone): Creature {
  const config = CREATURE_CONFIGS[type];
  return {
    id: `creature_${creatureIdCounter++}`,
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    type,
    health: config.health,
    maxHealth: config.health,
    state: 'patrol',
    stunTimer: 0,
    detectionRadius: config.detectionRadius,
    speed: config.speed,
    size: config.size,
    patrolCenter: { ...pos },
    patrolRadius: 80 + Math.random() * 120,
    patrolAngle: Math.random() * Math.PI * 2,
    zone,
    color: config.color,
    glowColor: config.glowColor,
    damage: config.damage,
  };
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
  if (dist < effectiveDetection && creature.type !== 'fish' && creature.type !== 'jellyfish') {
    creature.state = 'chase';
  } else if (dist < effectiveDetection * 0.5 && creature.type === 'fish') {
    creature.state = 'flee';
  } else {
    creature.state = 'patrol';
  }

  switch (creature.state) {
    case 'chase': {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      creature.vel.x += nx * creature.speed * 0.05;
      creature.vel.y += ny * creature.speed * 0.05;
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

  // Speed cap
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
