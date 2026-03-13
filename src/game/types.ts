export interface Vec2 {
  x: number;
  y: number;
}

export interface SubmarineState {
  pos: Vec2;
  vel: Vec2;
  rotation: number;
  aimAngle: number; // Independent aim angle from mouse
  thrust: number;
  hull: number;
  maxHull: number;
  power: number;
  maxPower: number;
  oxygen: number;
  maxOxygen: number;
  depth: number;
  engineNoise: number;
  lightOn: boolean;
  weapons: WeaponSlot[];
  activeWeaponIndex: number;
  sonarCooldown: number;
  sonarActive: boolean;
  speed: number;
  harpoonDamage: number;
}

export interface WeaponSlot {
  type: WeaponType;
  ammo: number;
  maxAmmo: number;
  cooldown: number;
}

export type WeaponType = 'harpoon' | 'shock' | 'torpedo' | 'plasma' | 'railgun' | 'flak' | 'cryo' | 'vortex';

export type WeaponTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface Creature {
  id: string;
  pos: Vec2;
  vel: Vec2;
  type: CreatureType;
  health: number;
  maxHealth: number;
  state: 'patrol' | 'chase' | 'ambush' | 'flee' | 'stunned' | 'charge';
  stunTimer: number;
  detectionRadius: number;
  speed: number;
  size: number;
  patrolCenter: Vec2;
  patrolRadius: number;
  patrolAngle: number;
  zone: DepthZone;
  color: string;
  glowColor: string;
  damage: number;
  isBoss: boolean;
  attackCooldown: number;
  chargeTimer: number;
  chargeTarget: Vec2 | null;
}

export type CreatureType = 'angler' | 'squid' | 'serpent' | 'jellyfish' | 'fish' | 'leviathan' | 'eel' | 'phantom';
export type DepthZone = 'sunlight' | 'twilight' | 'midnight' | 'abyssal' | 'hadal';

export interface TerrainSegment {
  points: Vec2[];
  type: 'wall' | 'cave' | 'trench' | 'ruin';
}

export interface TerrainFeature {
  pos: Vec2;
  type: 'cave' | 'ruin' | 'wreck' | 'kelp' | 'rock_formation' | 'chest';
  size: number;
  color: string;
  collected?: boolean;
  coinsValue?: number;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'bubble' | 'biolum' | 'debris' | 'sonar' | 'coin' | 'electric' | 'explosion';
}

export interface SonarPing {
  origin: Vec2;
  radius: number;
  maxRadius: number;
  alpha: number;
  echoReturned: boolean;
  echoRadius: number;
}

export interface GameState {
  sub: SubmarineState;
  creatures: Creature[];
  terrain: { left: Vec2[]; right: Vec2[]; features: TerrainFeature[] };
  particles: Particle[];
  sonarPings: SonarPing[];
  camera: Vec2;
  worldWidth: number;
  score: number;
  coins: number;
  xpEarned: number;
  time: number;
  paused: boolean;
  gameOver: boolean;
  currentZone: DepthZone;
  deepestDepth: number;
  resources: Record<string, number>;
  killCount: Record<string, number>;
  bossesDefeated: string[];
  projectiles: Projectile[];
  generatedDepth: number; // How deep terrain has been generated
}

export interface Projectile {
  pos: Vec2;
  vel: Vec2;
  life: number;
  damage: number;
  type: WeaponType;
  radius?: number;
  special?: string; // Special ability tag
}

export interface ZoneConfig {
  name: string;
  zone: DepthZone;
  minDepth: number;
  maxDepth: number;
  waterColor: string;
  visibility: number;
  ambientLight: number;
  creatureTypes: CreatureType[];
  creatureDensity: number;
  pressureDamage: number;
  terrainDensity: number;
}

export interface PlayerProgress {
  coins: number;
  upgrades: Record<string, number>;
  deepestEver: number;
  totalKills: number;
  questsCompleted: string[];
  unlockedZones: DepthZone[];
  xp: number;
  level: number;
  weaponsOwned: WeaponType[];
  equippedWeapon?: WeaponType;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  category: 'submarine' | 'weapons' | 'systems';
}

export interface WeaponShopItem {
  type: WeaponType;
  name: string;
  description: string;
  cost: number;
  damage: number;
  ammo: number;
  fireRate: number;
  tier: WeaponTier;
  special?: string;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'depth' | 'kill' | 'collect' | 'survive' | 'boss' | 'level';
  target: number;
  reward: number;
  xpReward: number;
  zone?: DepthZone;
  creatureType?: CreatureType;
}

export type GameScreen = 'home' | 'shop' | 'game' | 'multiplayer';

// XP/Level helpers
export function getXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  let xpNeeded = 100;
  let remaining = totalXp;
  while (remaining >= xpNeeded) {
    remaining -= xpNeeded;
    level++;
    xpNeeded = Math.floor(100 * Math.pow(1.5, level - 1));
  }
  return level;
}

export function getXpProgress(totalXp: number): { level: number; current: number; needed: number } {
  let level = 1;
  let xpNeeded = 100;
  let remaining = totalXp;
  while (remaining >= xpNeeded) {
    remaining -= xpNeeded;
    level++;
    xpNeeded = Math.floor(100 * Math.pow(1.5, level - 1));
  }
  return { level, current: remaining, needed: xpNeeded };
}

export const TIER_COLORS: Record<WeaponTier, string> = {
  common: '#b4c5cf',
  rare: '#4da6ff',
  epic: '#a855f7',
  legendary: '#f59e0b',
  mythic: '#ef4444',
};
