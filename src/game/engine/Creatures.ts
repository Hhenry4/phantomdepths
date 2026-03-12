import { Creature, Vec2, CreatureType, DepthZone } from '../types';
import { CREATURE_CONFIGS, DEPTH_ZONES } from '../constants';
import { getZoneAtDepth } from './Terrain';

let creatureIdCounter = 0;

export function spawnCreature(type: CreatureType, pos: Vec2, zone: DepthZone, isBoss = false): Creature {
  const config = CREATURE_CONFIGS[type];
  const bossMultiplier = isBoss ? 3.5 : 1;
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
    speed: config.speed * (isBoss ? 0.9 : 1),
    size: config.size * (isBoss ? 2.2 : 1),
    patrolCenter: { ...pos },
    patrolRadius: isBoss ? 200 : 80 + Math.random() * 150,
    patrolAngle: Math.random() * Math.PI * 2,
    zone,
    color: config.color,
    glowColor: config.glowColor,
    damage: config.damage * bossMultiplier,
    isBoss,
    attackCooldown: 0,
    chargeTimer: 0,
    chargeTarget: null,
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
  const count = Math.floor(zoneConfig.creatureDensity * 4) + (Math.random() < zoneConfig.creatureDensity ? 1 : 0);

  for (let i = 0; i < count; i++) {
    const type = zoneConfig.creatureTypes[Math.floor(Math.random() * zoneConfig.creatureTypes.length)];
    const x = (Math.random() - 0.5) * worldWidth * 0.8;
    const y = depth + Math.random() * 300;
    creatures.push(spawnCreature(type, { x, y }, zone));
  }

  return creatures;
}

export function updateCreature(creature: Creature, subPos: Vec2, dt: number, engineNoise: number): void {
  if (creature.attackCooldown > 0) creature.attackCooldown -= dt;

  if (creature.stunTimer > 0) {
    creature.stunTimer -= dt;
    creature.state = 'stunned';
    creature.vel.x *= 0.93;
    creature.vel.y *= 0.93;
    creature.pos.x += creature.vel.x;
    creature.pos.y += creature.vel.y;
    return;
  }

  const dx = subPos.x - creature.pos.x;
  const dy = subPos.y - creature.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const effectiveDetection = creature.detectionRadius * (1 + engineNoise * 0.8);

  // State transitions with more advanced AI
  if (creature.type === 'fish') {
    creature.state = dist < effectiveDetection * 0.5 ? 'flee' : 'patrol';
  } else if (creature.type === 'jellyfish') {
    creature.state = 'patrol';
  } else if (creature.type === 'eel') {
    // Eels ambush then charge
    if (dist < effectiveDetection * 0.3 && creature.chargeTimer <= 0) {
      creature.state = 'charge';
      creature.chargeTimer = 120;
      creature.chargeTarget = { ...subPos };
    } else if (dist < effectiveDetection) {
      creature.state = creature.chargeTimer > 60 ? 'ambush' : 'chase';
    } else {
      creature.state = 'patrol';
    }
  } else if (creature.type === 'phantom') {
    // Phantoms teleport-ambush: they stay in ambush until very close, then charge
    if (dist < effectiveDetection * 0.4) {
      creature.state = 'charge';
      if (!creature.chargeTarget) creature.chargeTarget = { ...subPos };
    } else if (dist < effectiveDetection) {
      creature.state = 'ambush';
    } else {
      creature.state = 'patrol';
    }
  } else {
    if (dist < effectiveDetection) {
      // Larger creatures charge when close
      if (dist < effectiveDetection * 0.3 && creature.chargeTimer <= 0 && (creature.type === 'serpent' || creature.type === 'leviathan')) {
        creature.state = 'charge';
        creature.chargeTimer = 90;
        creature.chargeTarget = { ...subPos };
      } else {
        creature.state = 'chase';
      }
    } else {
      creature.state = 'patrol';
    }
  }

  // Boss creatures are more aggressive
  if (creature.isBoss && dist < effectiveDetection * 1.8) {
    if (dist < effectiveDetection * 0.4 && creature.chargeTimer <= 0) {
      creature.state = 'charge';
      creature.chargeTimer = 60;
      creature.chargeTarget = { ...subPos };
    } else if (creature.state !== 'charge') {
      creature.state = 'chase';
    }
  }

  if (creature.chargeTimer > 0) creature.chargeTimer -= dt;

  const chaseSpeed = creature.isBoss ? 0.1 : 0.06;

  switch (creature.state) {
    case 'charge': {
      // Fast lunge towards target
      const target = creature.chargeTarget || subPos;
      const cdx = target.x - creature.pos.x;
      const cdy = target.y - creature.pos.y;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
      const chargeForce = creature.isBoss ? 0.2 : 0.15;
      creature.vel.x += (cdx / (cdist || 1)) * creature.speed * chargeForce;
      creature.vel.y += (cdy / (cdist || 1)) * creature.speed * chargeForce;
      if (cdist < 30) creature.chargeTarget = null;
      break;
    }
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
    case 'ambush': {
      // Stay still, wait
      creature.vel.x *= 0.9;
      creature.vel.y *= 0.9;
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

  const chargeMaxSpeed = creature.state === 'charge' ? creature.speed * 2 : creature.speed;
  const speed = Math.sqrt(creature.vel.x ** 2 + creature.vel.y ** 2);
  if (speed > chargeMaxSpeed) {
    creature.vel.x = (creature.vel.x / speed) * chargeMaxSpeed;
    creature.vel.y = (creature.vel.y / speed) * chargeMaxSpeed;
  }

  creature.vel.x *= 0.98;
  creature.vel.y *= 0.98;
  creature.pos.x += creature.vel.x;
  creature.pos.y += creature.vel.y;
}
