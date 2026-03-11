export interface Vec2 {
  x: number;
  y: number;
}

export interface SubmarineState {
  pos: Vec2;
  vel: Vec2;
  rotation: number;
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

export type WeaponType = 'harpoon' | 'shock' | 'torpedo' | 'plasma';

export interface Creature {
  id: string;
  pos: Vec2;
  vel: Vec2;
  type: CreatureType;
  health: number;
  maxHealth: number;
  state: 'patrol' | 'chase' | 'ambush' | 'flee' | 'stunned';
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
}

export type CreatureType = 'angler' | 'squid' | 'serpent' | 'jellyfish' | 'fish' | 'leviathan';
export type DepthZone = 'sunlight' | 'twilight' | 'midnight' | 'abyssal' | 'hadal';

export interface TerrainSegment {
  points: Vec2[];
  type: 'wall' | 'cave' | 'trench' | 'ruin';
}

export interface TerrainFeature {
  pos: Vec2;
  type: 'cave' | 'ruin' | 'wreck' | 'coral' | 'vent' | 'crystal';
  size: number;
  color: string;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'bubble' | 'biolum' | 'debris' | 'sonar' | 'coin';
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
  time: number;
  paused: boolean;
  gameOver: boolean;
  currentZone: DepthZone;
  deepestDepth: number;
  resources: Record<string, number>;
  killCount: Record<string, number>;
  bossesDefeated: string[];
  projectiles: Projectile[];
}

export interface Projectile {
  pos: Vec2;
  vel: Vec2;
  life: number;
  damage: number;
  type: WeaponType;
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
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'depth' | 'kill' | 'collect' | 'survive' | 'boss';
  target: number;
  reward: number;
  zone?: DepthZone;
  creatureType?: CreatureType;
}

export type GameScreen = 'home' | 'shop' | 'game';
