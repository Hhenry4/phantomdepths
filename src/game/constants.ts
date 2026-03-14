import { ZoneConfig, Upgrade, Quest, WeaponShopItem } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

export const SUB_WIDTH = 60;
export const SUB_HEIGHT = 24;
export const SUB_MAX_SPEED = 5.5;
export const SUB_THRUST = 0.38;
export const SUB_ROTATION_SPEED = 0.04;
export const SUB_DRAG = 0.96;
export const SUB_GRAVITY = 0.008;

export const WORLD_WIDTH = 4200;
export const MAX_DEPTH = Number.MAX_SAFE_INTEGER;

export const LIGHT_RADIUS_BASE = 250;
export const SONAR_MAX_RADIUS = 600;
export const SONAR_COOLDOWN = 120;

export const HARPOON_SPEED = 12;
export const HARPOON_RANGE = 500;
export const HARPOON_COOLDOWN = 15;
export const HARPOON_HIT_RADIUS = 25;
export const HARPOON_BASE_DAMAGE = 20;

export const TERRAIN_CHUNK_SIZE = 2000;

export const XP_PER_KILL: Record<string, number> = {
  fish: 5,
  jellyfish: 8,
  angler: 20,
  eel: 25,
  squid: 40,
  serpent: 60,
  leviathan: 150,
  phantom: 300,
  lava_eel: 35,
  vent_crab: 30,
  magma_ray: 80,
  infernal_leviathan: 500,
};

export const DEPTH_ZONES: ZoneConfig[] = [
  {
    name: 'Sunlight Zone', zone: 'sunlight', minDepth: 0, maxDepth: 200,
    waterColor: '#0a4a6e', visibility: 1.5, ambientLight: 0.7,
    creatureTypes: ['fish', 'jellyfish'], creatureDensity: 0.18,
    pressureDamage: 0, terrainDensity: 0.3,
  },
  {
    name: 'Twilight Zone', zone: 'twilight', minDepth: 200, maxDepth: 1000,
    waterColor: '#062a42', visibility: 1.0, ambientLight: 0.3,
    creatureTypes: ['fish', 'jellyfish', 'angler', 'eel'], creatureDensity: 0.3,
    pressureDamage: 0, terrainDensity: 0.5,
  },
  {
    name: 'Midnight Zone', zone: 'midnight', minDepth: 1000, maxDepth: 4000,
    waterColor: '#030f1a', visibility: 0.6, ambientLight: 0.05,
    creatureTypes: ['angler', 'eel', 'squid', 'serpent'], creatureDensity: 0.35,
    pressureDamage: 0.02, terrainDensity: 0.7,
  },
  {
    name: 'Abyssal Plains', zone: 'abyssal', minDepth: 4000, maxDepth: 6000,
    waterColor: '#010810', visibility: 0.3, ambientLight: 0.01,
    creatureTypes: ['squid', 'serpent', 'leviathan', 'phantom'], creatureDensity: 0.28,
    pressureDamage: 0.06, terrainDensity: 0.8,
  },
  {
    name: 'Hadal Trench', zone: 'hadal', minDepth: 6000, maxDepth: 10000,
    waterColor: '#000408', visibility: 0.15, ambientLight: 0,
    creatureTypes: ['leviathan', 'serpent', 'phantom'], creatureDensity: 0.24,
    pressureDamage: 0.12, terrainDensity: 0.9,
  },
  {
    name: 'Volcanic Abyss', zone: 'volcanic', minDepth: 0, maxDepth: Number.MAX_SAFE_INTEGER,
    waterColor: '#1a0800', visibility: 0.4, ambientLight: 0.08,
    creatureTypes: ['lava_eel', 'vent_crab', 'magma_ray'], creatureDensity: 0.35,
    pressureDamage: 0.04, terrainDensity: 0.85,
  },
];

export const CREATURE_CONFIGS: Record<string, {
  health: number; speed: number; size: number; detectionRadius: number;
  color: string; glowColor: string; damage: number;
}> = {
  fish: { health: 10, speed: 1.5, size: 12, detectionRadius: 80, color: '#6ba3be', glowColor: '#8ecae6', damage: 0 },
  jellyfish: { health: 15, speed: 0.5, size: 18, detectionRadius: 60, color: '#e0b0ff', glowColor: '#f0d0ff', damage: 5 },
  angler: { health: 50, speed: 2.5, size: 28, detectionRadius: 250, color: '#ff6b35', glowColor: '#ffaa00', damage: 12 },
  eel: { health: 65, speed: 3.5, size: 22, detectionRadius: 280, color: '#4a90d9', glowColor: '#6bb5ff', damage: 15 },
  squid: { health: 100, speed: 3, size: 45, detectionRadius: 350, color: '#8b2252', glowColor: '#ff4081', damage: 18 },
  serpent: { health: 200, speed: 2.5, size: 60, detectionRadius: 450, color: '#1a472a', glowColor: '#00ff88', damage: 25 },
  leviathan: { health: 600, speed: 2, size: 120, detectionRadius: 600, color: '#2d1b4e', glowColor: '#7b2fff', damage: 40 },
  phantom: { health: 1000, speed: 2.8, size: 100, detectionRadius: 700, color: '#1a0a2e', glowColor: '#e0b0ff', damage: 50 },
  // Volcanic creatures
  lava_eel: { health: 80, speed: 4, size: 24, detectionRadius: 200, color: '#cc3300', glowColor: '#ff6600', damage: 18 },
  vent_crab: { health: 60, speed: 1.5, size: 16, detectionRadius: 120, color: '#8b4513', glowColor: '#ff4500', damage: 12 },
  magma_ray: { health: 250, speed: 2.2, size: 55, detectionRadius: 400, color: '#8b0000', glowColor: '#ff3300', damage: 30 },
  infernal_leviathan: { health: 2000, speed: 2.5, size: 150, detectionRadius: 800, color: '#1a0a00', glowColor: '#ff4400', damage: 60 },
};

export const UPGRADES: Upgrade[] = [
  // Submarine
  { id: 'hull', name: 'Hull Reinforcement', description: '+30 max hull integrity', maxLevel: 8, baseCost: 150, costMultiplier: 2.2, category: 'submarine' },
  { id: 'speed', name: 'Engine Boost', description: '+12% movement speed', maxLevel: 6, baseCost: 250, costMultiplier: 2.5, category: 'submarine' },
  { id: 'armor', name: 'Pressure Plating', description: '-25% pressure damage', maxLevel: 5, baseCost: 400, costMultiplier: 2.8, category: 'submarine' },
  { id: 'stealth', name: 'Silent Running', description: '-20% engine noise', maxLevel: 4, baseCost: 350, costMultiplier: 2.5, category: 'submarine' },
  // Weapons
  { id: 'damage', name: 'Harpoon Hardening', description: '+35% harpoon damage', maxLevel: 6, baseCost: 200, costMultiplier: 2.3, category: 'weapons' },
  { id: 'ammo', name: 'Ammo Rack', description: '+8 max harpoon ammo', maxLevel: 6, baseCost: 120, costMultiplier: 1.8, category: 'weapons' },
  { id: 'firerate', name: 'Auto-Loader', description: '-15% weapon cooldown', maxLevel: 4, baseCost: 300, costMultiplier: 2.5, category: 'weapons' },
  { id: 'projspeed', name: 'Accelerator Rails', description: '+20% projectile speed', maxLevel: 3, baseCost: 350, costMultiplier: 2.5, category: 'weapons' },
  // Systems
  { id: 'oxygen', name: 'O2 Tank Expansion', description: '+30 max oxygen capacity', maxLevel: 8, baseCost: 130, costMultiplier: 2.0, category: 'systems' },
  { id: 'power', name: 'Power Cell Upgrade', description: '+30 max power reserve', maxLevel: 8, baseCost: 130, costMultiplier: 2.0, category: 'systems' },
  { id: 'sonar', name: 'Sonar Amplifier', description: '+25% sonar range, -15% cooldown', maxLevel: 5, baseCost: 250, costMultiplier: 2.3, category: 'systems' },
  { id: 'regen', name: 'Nano-Repair Bots', description: 'Slowly regenerate hull over time', maxLevel: 3, baseCost: 800, costMultiplier: 3.0, category: 'systems' },
  { id: 'light', name: 'Deep Beam Upgrade', description: '+30% light radius', maxLevel: 4, baseCost: 200, costMultiplier: 2.2, category: 'systems' },
  { id: 'heatshield', name: 'Thermal Shielding', description: '-20% heat buildup in volcanic zones', maxLevel: 4, baseCost: 500, costMultiplier: 2.5, category: 'submarine' },
];

export const WEAPON_SHOP: WeaponShopItem[] = [
  // ═══ COMMON (5) ═══
  { type: 'harpoon', name: 'Harpoon Launcher', description: 'Standard projectile weapon. Reliable and accurate.', cost: 0, damage: 20, ammo: 20, fireRate: 15, tier: 'common' },
  { type: 'needle', name: 'Needle Gun', description: 'Fast, low-damage darts. Great for small creatures.', cost: 100, damage: 8, ammo: 40, fireRate: 8, tier: 'common', special: 'Rapid Darts' },
  { type: 'net', name: 'Net Launcher', description: 'Slows targets by 50% on hit. Utility weapon.', cost: 200, damage: 5, ammo: 10, fireRate: 40, tier: 'common', special: 'Slow Target' },
  { type: 'acid', name: 'Acid Sprayer', description: 'Short-range corrosive spray. Damage over time.', cost: 300, damage: 6, ammo: 30, fireRate: 6, tier: 'common', special: 'DoT Spray' },
  { type: 'mine', name: 'Sea Mine Layer', description: 'Drops proximity mines behind your sub.', cost: 400, damage: 45, ammo: 8, fireRate: 50, tier: 'common', special: 'Proximity Mine' },

  // ═══ RARE (5) ═══
  { type: 'shock', name: 'Shock Cannon', description: 'Stuns all creatures in radius. AoE crowd control.', cost: 800, damage: 8, ammo: 12, fireRate: 45, tier: 'rare', special: 'AoE Stun' },
  { type: 'flak', name: 'Flak Cannon', description: 'Fires a spread of 5 projectiles. Great for groups.', cost: 1200, damage: 10, ammo: 15, fireRate: 30, tier: 'rare', special: 'Shotgun Spread' },
  { type: 'lance', name: 'Thermal Lance', description: 'Continuous beam that deals increasing damage.', cost: 1500, damage: 18, ammo: 15, fireRate: 12, tier: 'rare', special: 'Ramp Damage' },
  { type: 'pulse', name: 'Pulse Cannon', description: 'Knockback wave that pushes creatures away.', cost: 1800, damage: 14, ammo: 10, fireRate: 35, tier: 'rare', special: 'Knockback' },
  { type: 'drill', name: 'Drill Shot', description: 'Spinning projectile that shreds through armor.', cost: 2000, damage: 30, ammo: 10, fireRate: 25, tier: 'rare', special: 'Armor Break' },

  // ═══ EPIC (5) ═══
  { type: 'torpedo', name: 'Torpedo Bay', description: 'Massive damage with explosive radius. Limited ammo.', cost: 2500, damage: 80, ammo: 6, fireRate: 60, tier: 'epic', special: 'Explosion AoE' },
  { type: 'cryo', name: 'Cryo Beam', description: 'Freezes targets, slowing them by 80% for 5 seconds.', cost: 3000, damage: 15, ammo: 20, fireRate: 20, tier: 'epic', special: 'Deep Freeze' },
  { type: 'arc', name: 'Arc Caster', description: 'Lightning chains between 3 nearby enemies.', cost: 3500, damage: 22, ammo: 12, fireRate: 35, tier: 'epic', special: 'Chain Lightning' },
  { type: 'swarm', name: 'Swarm Missiles', description: 'Launches 4 homing micro-missiles.', cost: 4000, damage: 15, ammo: 8, fireRate: 55, tier: 'epic', special: 'Homing Swarm' },
  { type: 'nova', name: 'Nova Cannon', description: 'Charged blast that explodes in a massive radius.', cost: 4500, damage: 60, ammo: 5, fireRate: 75, tier: 'epic', special: 'Mega Blast' },

  // ═══ LEGENDARY (5) ═══
  { type: 'plasma', name: 'Plasma Cutter', description: 'Rapid-fire energy beam. Melts through anything.', cost: 5000, damage: 12, ammo: 60, fireRate: 5, tier: 'legendary', special: 'Rapid Fire' },
  { type: 'railgun', name: 'Railgun', description: 'Pierces through ALL enemies in a line. Devastating.', cost: 8000, damage: 120, ammo: 8, fireRate: 80, tier: 'legendary', special: 'Piercing Shot' },
  { type: 'siphon', name: 'Siphon Beam', description: 'Drains enemy health and repairs your hull.', cost: 10000, damage: 18, ammo: 15, fireRate: 10, tier: 'legendary', special: 'Life Steal' },
  { type: 'oblivion', name: 'Oblivion Orb', description: 'Slow-moving sphere that disintegrates everything.', cost: 12000, damage: 200, ammo: 3, fireRate: 100, tier: 'legendary', special: 'Annihilate' },
  { type: 'leech', name: 'Leech Torpedo', description: 'Attaches to target, draining health over 10s.', cost: 14000, damage: 150, ammo: 4, fireRate: 90, tier: 'legendary', special: 'Attach & Drain' },

  // ═══ MYTHIC (5) ═══
  { type: 'vortex', name: 'Void Vortex', description: 'Creates a black hole that pulls and damages all nearby enemies.', cost: 15000, damage: 40, ammo: 3, fireRate: 120, tier: 'mythic', special: 'Gravity Well' },
  { type: 'rift', name: 'Rift Tear', description: 'Tears a rift in space that damages everything crossing it for 15s.', cost: 20000, damage: 50, ammo: 2, fireRate: 150, tier: 'mythic', special: 'Dimensional Rift' },
  { type: 'trident', name: 'Poseidon Trident', description: 'Triple harpoon burst that seeks enemies. The ultimate classic.', cost: 25000, damage: 60, ammo: 15, fireRate: 12, tier: 'mythic', special: 'Triple Homing' },
  { type: 'kraken', name: 'Kraken\'s Wrath', description: 'Nuclear torpedo with screen-wide detonation.', cost: 30000, damage: 300, ammo: 1, fireRate: 200, tier: 'mythic', special: 'Nuclear Blast' },
  { type: 'starforge', name: 'Star Forge Beam', description: 'Continuous beam of stellar energy. Infinite range.', cost: 50000, damage: 25, ammo: 100, fireRate: 3, tier: 'mythic', special: 'Infinite Beam' },
];

export const QUESTS: Quest[] = [
  { id: 'q_depth_200', name: 'First Descent', description: 'Reach 200m depth', type: 'depth', target: 200, reward: 50, xpReward: 30 },
  { id: 'q_depth_500', name: 'Into the Twilight', description: 'Reach 500m depth', type: 'depth', target: 500, reward: 100, xpReward: 50 },
  { id: 'q_depth_1000', name: 'Into Darkness', description: 'Reach 1000m depth', type: 'depth', target: 1000, reward: 200, xpReward: 100 },
  { id: 'q_depth_2000', name: 'Deep Diver', description: 'Reach 2000m depth', type: 'depth', target: 2000, reward: 350, xpReward: 150 },
  { id: 'q_depth_4000', name: 'Abyssal Explorer', description: 'Reach 4000m depth', type: 'depth', target: 4000, reward: 600, xpReward: 250 },
  { id: 'q_depth_6000', name: 'Hadal Pioneer', description: 'Reach 6000m depth', type: 'depth', target: 6000, reward: 1000, xpReward: 400 },
  { id: 'q_depth_7500', name: 'Edge of the Abyss', description: 'Reach 7500m depth', type: 'depth', target: 7500, reward: 2000, xpReward: 600 },
  { id: 'q_depth_10000', name: 'Beyond the Known', description: 'Reach 10000m depth', type: 'depth', target: 10000, reward: 5000, xpReward: 1000 },
  { id: 'q_kill_10', name: 'First Blood', description: 'Kill 10 creatures total', type: 'kill', target: 10, reward: 80, xpReward: 40 },
  { id: 'q_kill_angler_5', name: 'Angler Hunter', description: 'Kill 5 Anglers', type: 'kill', target: 5, reward: 120, xpReward: 60, creatureType: 'angler' },
  { id: 'q_kill_eel_5', name: 'Eel Exterminator', description: 'Kill 5 Abyss Eels', type: 'kill', target: 5, reward: 150, xpReward: 75, creatureType: 'eel' },
  { id: 'q_kill_squid_3', name: 'Squid Slayer', description: 'Kill 3 Giant Squids', type: 'kill', target: 3, reward: 250, xpReward: 120, creatureType: 'squid' },
  { id: 'q_kill_serpent_3', name: 'Serpent Wrangler', description: 'Kill 3 Abyss Serpents', type: 'kill', target: 3, reward: 400, xpReward: 180, creatureType: 'serpent' },
  { id: 'q_kill_leviathan_1', name: 'Leviathan Slayer', description: 'Kill a Leviathan', type: 'kill', target: 1, reward: 800, xpReward: 350, creatureType: 'leviathan' },
  { id: 'q_kill_phantom_1', name: 'Phantom Hunter', description: 'Kill a Phantom Entity', type: 'kill', target: 1, reward: 1500, xpReward: 500, creatureType: 'phantom' },
  { id: 'q_kill_50', name: 'Veteran Hunter', description: 'Kill 50 creatures total', type: 'kill', target: 50, reward: 500, xpReward: 250 },
  { id: 'q_kill_100', name: 'Exterminator', description: 'Kill 100 creatures total', type: 'kill', target: 100, reward: 1200, xpReward: 500 },
  { id: 'q_boss_twilight', name: 'Zone Guardian', description: 'Defeat the Twilight Boss', type: 'boss', target: 1, reward: 400, xpReward: 200, zone: 'twilight' },
  { id: 'q_boss_midnight', name: 'Midnight Terror', description: 'Defeat the Midnight Boss', type: 'boss', target: 1, reward: 800, xpReward: 400, zone: 'midnight' },
  { id: 'q_boss_abyssal', name: 'Abyssal Conqueror', description: 'Defeat the Abyssal Boss', type: 'boss', target: 1, reward: 1500, xpReward: 600, zone: 'abyssal' },
  { id: 'q_boss_hadal', name: 'Hadal Nemesis', description: 'Defeat the Hadal Boss', type: 'boss', target: 1, reward: 3000, xpReward: 1000, zone: 'hadal' },
  { id: 'q_boss_volcanic', name: 'Infernal Conqueror', description: 'Defeat the Infernal Leviathan', type: 'boss', target: 1, reward: 5000, xpReward: 2000, zone: 'volcanic' },
  { id: 'q_survive_500', name: 'Deep Survivor', description: 'Survive below 500m for 60 seconds', type: 'survive', target: 60, reward: 120, xpReward: 60 },
  { id: 'q_survive_2000', name: 'Pressure Veteran', description: 'Survive below 2000m for 90 seconds', type: 'survive', target: 90, reward: 400, xpReward: 200 },
  { id: 'q_level_5', name: 'Experienced Pilot', description: 'Reach Level 5', type: 'level', target: 5, reward: 300, xpReward: 0 },
  { id: 'q_level_10', name: 'Elite Commander', description: 'Reach Level 10', type: 'level', target: 10, reward: 1000, xpReward: 0 },
  { id: 'q_level_20', name: 'Master of the Deep', description: 'Reach Level 20', type: 'level', target: 20, reward: 3000, xpReward: 0 },
  { id: 'q_collect_5', name: 'Treasure Hunter', description: 'Collect 5 treasure chests', type: 'collect', target: 5, reward: 200, xpReward: 80 },
  { id: 'q_collect_20', name: 'Salvage Expert', description: 'Collect 20 treasure chests', type: 'collect', target: 20, reward: 800, xpReward: 300 },
];

export const BOSS_SPAWN_DEPTHS = [190, 990, 3950, 5950];
export const VOLCANIC_BOSS_DEPTH = 3000; // Infernal Leviathan spawns at 3000m in volcanic map

export const COIN_VALUES: Record<string, number> = {
  fish: 3, jellyfish: 5, angler: 12, eel: 15,
  squid: 25, serpent: 40, leviathan: 100, phantom: 200,
  lava_eel: 20, vent_crab: 15, magma_ray: 50, infernal_leviathan: 500,
};

// NPC configs for quest givers scattered in the world
export const NPC_CONFIGS = [
  { name: 'Old Mariner', dialogue: 'The twilight zone holds many secrets...', depth: 150, questId: 'q_depth_200' },
  { name: 'Dr. Coral', dialogue: 'I need coral specimens from the deep.', depth: 400, questId: 'q_depth_500' },
  { name: 'Navigator Rex', dialogue: 'Few have ventured past 1000m...', depth: 800, questId: 'q_depth_1000' },
  { name: 'The Hermit', dialogue: 'Something ancient stirs below...', depth: 1800, questId: 'q_depth_2000' },
  { name: 'Ghost Diver', dialogue: 'I lost my crew to the Leviathan...', depth: 3500, questId: 'q_kill_leviathan_1' },
];
