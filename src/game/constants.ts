import { ZoneConfig, Upgrade, Quest } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

export const SUB_WIDTH = 60;
export const SUB_HEIGHT = 24;
export const SUB_MAX_SPEED = 3.5;
export const SUB_THRUST = 0.22;
export const SUB_ROTATION_SPEED = 0.04;
export const SUB_DRAG = 0.96;
export const SUB_GRAVITY = 0.008;

export const WORLD_WIDTH = 1200;
export const MAX_DEPTH = 8000;

export const LIGHT_RADIUS_BASE = 250;
export const SONAR_MAX_RADIUS = 600;
export const SONAR_COOLDOWN = 120;

export const HARPOON_SPEED = 12;
export const HARPOON_RANGE = 500;
export const HARPOON_COOLDOWN = 15;
export const HARPOON_HIT_RADIUS = 25;
export const HARPOON_BASE_DAMAGE = 20;

export const DEPTH_ZONES: ZoneConfig[] = [
  {
    name: 'Sunlight Zone',
    zone: 'sunlight',
    minDepth: 0,
    maxDepth: 200,
    waterColor: '#0a4a6e',
    visibility: 1.5,
    ambientLight: 0.7,
    creatureTypes: ['fish', 'jellyfish'],
    creatureDensity: 0.3,
    pressureDamage: 0,
    terrainDensity: 0.3,
  },
  {
    name: 'Twilight Zone',
    zone: 'twilight',
    minDepth: 200,
    maxDepth: 1000,
    waterColor: '#062a42',
    visibility: 1.0,
    ambientLight: 0.3,
    creatureTypes: ['fish', 'jellyfish', 'angler'],
    creatureDensity: 0.5,
    pressureDamage: 0,
    terrainDensity: 0.5,
  },
  {
    name: 'Midnight Zone',
    zone: 'midnight',
    minDepth: 1000,
    maxDepth: 4000,
    waterColor: '#030f1a',
    visibility: 0.6,
    ambientLight: 0.05,
    creatureTypes: ['angler', 'squid', 'serpent'],
    creatureDensity: 0.7,
    pressureDamage: 0.02,
    terrainDensity: 0.7,
  },
  {
    name: 'Abyssal Plains',
    zone: 'abyssal',
    minDepth: 4000,
    maxDepth: 6000,
    waterColor: '#010810',
    visibility: 0.3,
    ambientLight: 0.01,
    creatureTypes: ['squid', 'serpent', 'leviathan'],
    creatureDensity: 0.4,
    pressureDamage: 0.06,
    terrainDensity: 0.8,
  },
  {
    name: 'Hadal Trench',
    zone: 'hadal',
    minDepth: 6000,
    maxDepth: 8000,
    waterColor: '#000408',
    visibility: 0.15,
    ambientLight: 0,
    creatureTypes: ['leviathan', 'serpent'],
    creatureDensity: 0.2,
    pressureDamage: 0.12,
    terrainDensity: 0.9,
  },
];

export const CREATURE_CONFIGS: Record<string, {
  health: number;
  speed: number;
  size: number;
  detectionRadius: number;
  color: string;
  glowColor: string;
  damage: number;
}> = {
  fish: { health: 10, speed: 1.5, size: 12, detectionRadius: 80, color: '#6ba3be', glowColor: '#8ecae6', damage: 0 },
  jellyfish: { health: 15, speed: 0.5, size: 18, detectionRadius: 60, color: '#e0b0ff', glowColor: '#f0d0ff', damage: 3 },
  angler: { health: 40, speed: 2.2, size: 28, detectionRadius: 200, color: '#ff6b35', glowColor: '#ffaa00', damage: 8 },
  squid: { health: 80, speed: 3, size: 45, detectionRadius: 300, color: '#8b2252', glowColor: '#ff4081', damage: 12 },
  serpent: { health: 150, speed: 2.5, size: 60, detectionRadius: 400, color: '#1a472a', glowColor: '#00ff88', damage: 18 },
  leviathan: { health: 500, speed: 2, size: 120, detectionRadius: 600, color: '#2d1b4e', glowColor: '#7b2fff', damage: 30 },
};

export const UPGRADES: Upgrade[] = [
  { id: 'hull', name: 'Hull Reinforcement', description: '+25 max hull integrity', maxLevel: 5, baseCost: 50, costMultiplier: 1.8 },
  { id: 'oxygen', name: 'O2 Tank Expansion', description: '+25 max oxygen capacity', maxLevel: 5, baseCost: 40, costMultiplier: 1.8 },
  { id: 'power', name: 'Power Cell Upgrade', description: '+25 max power reserve', maxLevel: 5, baseCost: 40, costMultiplier: 1.8 },
  { id: 'speed', name: 'Engine Boost', description: '+15% movement speed', maxLevel: 4, baseCost: 80, costMultiplier: 2.0 },
  { id: 'damage', name: 'Harpoon Hardening', description: '+40% harpoon damage', maxLevel: 4, baseCost: 60, costMultiplier: 2.0 },
  { id: 'ammo', name: 'Ammo Rack', description: '+10 max harpoon ammo', maxLevel: 4, baseCost: 30, costMultiplier: 1.5 },
  { id: 'armor', name: 'Pressure Plating', description: '-30% pressure damage', maxLevel: 3, baseCost: 100, costMultiplier: 2.5 },
  { id: 'sonar', name: 'Sonar Amplifier', description: '+30% sonar range, -20% cooldown', maxLevel: 3, baseCost: 70, costMultiplier: 2.0 },
];

export const QUESTS: Quest[] = [
  { id: 'q_depth_200', name: 'First Descent', description: 'Reach 200m depth', type: 'depth', target: 200, reward: 30 },
  { id: 'q_depth_1000', name: 'Into Darkness', description: 'Reach 1000m depth', type: 'depth', target: 1000, reward: 80 },
  { id: 'q_depth_4000', name: 'Abyssal Explorer', description: 'Reach 4000m depth', type: 'depth', target: 4000, reward: 200 },
  { id: 'q_depth_6000', name: 'Hadal Pioneer', description: 'Reach 6000m depth', type: 'depth', target: 6000, reward: 500 },
  { id: 'q_kill_angler_5', name: 'Angler Hunter', description: 'Kill 5 Anglers', type: 'kill', target: 5, reward: 50, creatureType: 'angler' },
  { id: 'q_kill_squid_3', name: 'Squid Slayer', description: 'Kill 3 Giant Squids', type: 'kill', target: 3, reward: 100, creatureType: 'squid' },
  { id: 'q_kill_serpent_2', name: 'Serpent Wrangler', description: 'Kill 2 Abyss Serpents', type: 'kill', target: 2, reward: 150, creatureType: 'serpent' },
  { id: 'q_boss_twilight', name: 'Zone Guardian', description: 'Defeat the Twilight Boss', type: 'boss', target: 1, reward: 200, zone: 'twilight' },
  { id: 'q_boss_midnight', name: 'Midnight Terror', description: 'Defeat the Midnight Boss', type: 'boss', target: 1, reward: 400, zone: 'midnight' },
  { id: 'q_survive_500', name: 'Deep Survivor', description: 'Survive below 500m for 60 seconds', type: 'survive', target: 60, reward: 60 },
];

export const BOSS_SPAWN_DEPTHS = [190, 990, 3950, 5950];

export const COIN_VALUES: Record<string, number> = {
  fish: 2,
  jellyfish: 3,
  angler: 8,
  squid: 15,
  serpent: 25,
  leviathan: 60,
};
