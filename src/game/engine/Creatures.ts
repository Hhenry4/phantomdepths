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
    abilityTimer: isBoss ? 200 : undefined,
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
  const count = Math.floor(zoneConfig.creatureDensity * 7) + (Math.random() < zoneConfig.creatureDensity ? 2 : 1);

  for (let i = 0; i < count; i++) {
    const type = zoneConfig.creatureTypes[Math.floor(Math.random() * zoneConfig.creatureTypes.length)];
    const x = (Math.random() - 0.5) * worldWidth * 0.8;
    const y = depth + Math.random() * 300;
    creatures.push(spawnCreature(type, { x, y: Math.max(20, y) }, zone));
  }

  return creatures;
}

// === VOLCANIC CREATURES ===
export function spawnVolcanicCreatures(depth: number, worldWidth: number): Creature[] {
  const creatures: Creature[] = [];
  const types: CreatureType[] = ['lava_eel', 'vent_crab', 'magma_ray'];
  const count = 2 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    // Magma rays are rarer
    const r = Math.random();
    const type = r < 0.15 ? 'magma_ray' : r < 0.5 ? 'lava_eel' : 'vent_crab';
    const x = (Math.random() - 0.5) * worldWidth * 0.8;
    const y = Math.max(20, depth + Math.random() * 300);
    creatures.push(spawnCreature(type, { x, y }, 'volcanic'));
  }

  return creatures;
}

export function spawnVolcanicBoss(worldWidth: number): Creature {
  const boss = spawnCreature('infernal_leviathan', { x: 0, y: 3000 }, 'volcanic', true);
  boss.abilityTimer = 150;
  return boss;
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

  // Submerged boss mechanic (lava dive)
  if (creature.submerged) {
    creature.abilityTimer = (creature.abilityTimer ?? 0) - dt;
    if ((creature.abilityTimer ?? 0) <= 0) {
      creature.submerged = false;
      creature.pos = { x: subPos.x + (Math.random() - 0.5) * 200, y: subPos.y + 100 };
      creature.vel = { x: 0, y: -8 }; // Burst upward
    }
    return;
  }

  const dx = subPos.x - creature.pos.x;
  const dy = subPos.y - creature.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const effectiveDetection = creature.detectionRadius * (1 + engineNoise * 0.8);

  // State transitions
  if (creature.type === 'fish') {
    creature.state = dist < effectiveDetection * 0.5 ? 'flee' : 'patrol';
  } else if (creature.type === 'jellyfish') {
    creature.state = 'patrol';
  } else if (creature.type === 'vent_crab') {
    // Crabs swarm aggressively
    creature.state = dist < effectiveDetection ? 'chase' : 'patrol';
  } else if (creature.type === 'lava_eel') {
    // Lava eels ambush from fissures then charge
    if (dist < effectiveDetection * 0.3 && creature.chargeTimer <= 0) {
      creature.state = 'charge';
      creature.chargeTimer = 80;
      creature.chargeTarget = { ...subPos };
    } else if (dist < effectiveDetection) {
      creature.state = creature.chargeTimer > 40 ? 'ambush' : 'chase';
    } else {
      creature.state = 'patrol';
    }
  } else if (creature.type === 'magma_ray') {
    // Rays patrol and chase when close
    if (dist < effectiveDetection * 0.5) {
      creature.state = 'chase';
    } else if (dist < effectiveDetection) {
      creature.state = 'chase';
    } else {
      creature.state = 'patrol';
    }
  } else if (creature.type === 'eel') {
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

    // Infernal Leviathan abilities
    if (creature.type === 'infernal_leviathan' && creature.isBoss) {
      creature.abilityTimer = (creature.abilityTimer ?? 0) - dt;
      if ((creature.abilityTimer ?? 0) <= 0) {
        const ability = Math.random();
        if (ability < 0.4) {
          // Lava Dive
          creature.submerged = true;
          creature.abilityTimer = 120;
          creature.activeAbility = 'lava_dive';
        } else {
          // Vent eruption - just reset timer
          creature.abilityTimer = 150 + Math.random() * 100;
          creature.activeAbility = 'vent_eruption';
        }
      }
    }
  }

  if (creature.chargeTimer > 0) creature.chargeTimer -= dt;

  const chaseSpeed = creature.isBoss ? 0.1 : 0.06;

  switch (creature.state) {
    case 'charge': {
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

  if (creature.pos.y < 10) {
    creature.pos.y = 10;
    creature.vel.y = Math.abs(creature.vel.y) * 0.5;
  }
}
