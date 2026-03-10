import { ZoneConfig } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

export const SUB_WIDTH = 60;
export const SUB_HEIGHT = 24;
export const SUB_MAX_SPEED = 4;
export const SUB_THRUST = 0.15;
export const SUB_ROTATION_SPEED = 0.04;
export const SUB_DRAG = 0.98;
export const SUB_GRAVITY = 0.02;

export const WORLD_WIDTH = 800;
export const MAX_DEPTH = 8000;

export const LIGHT_RADIUS_BASE = 250;
export const SONAR_MAX_RADIUS = 600;
export const SONAR_COOLDOWN = 180; // frames (3 seconds at 60fps)

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
    pressureDamage: 0.05,
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
    pressureDamage: 0.15,
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
    pressureDamage: 0.3,
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
  fish: { health: 10, speed: 1.5, size: 12, detectionRadius: 80, color: '#6ba3be', glowColor: '#8ecae6', damage: 2 },
  jellyfish: { health: 15, speed: 0.5, size: 18, detectionRadius: 60, color: '#e0b0ff', glowColor: '#f0d0ff', damage: 5 },
  angler: { health: 40, speed: 2, size: 28, detectionRadius: 200, color: '#ff6b35', glowColor: '#ffaa00', damage: 10 },
  squid: { health: 80, speed: 3, size: 45, detectionRadius: 300, color: '#8b2252', glowColor: '#ff4081', damage: 15 },
  serpent: { health: 150, speed: 2.5, size: 60, detectionRadius: 400, color: '#1a472a', glowColor: '#00ff88', damage: 25 },
  leviathan: { health: 500, speed: 2, size: 120, detectionRadius: 600, color: '#2d1b4e', glowColor: '#7b2fff', damage: 40 },
};
