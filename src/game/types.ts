export interface Vec2 {
  x: number;
  y: number;
}

export interface SubmarineState {
  pos: Vec2;
  vel: Vec2;
  rotation: number; // radians
  thrust: number;
  hull: number; // 0-100
  power: number; // 0-100
  oxygen: number; // 0-100
  depth: number; // meters
  engineNoise: number; // 0-1
  lightOn: boolean;
  weapons: WeaponSlot[];
  sonarCooldown: number;
  sonarActive: boolean;
}

export interface WeaponSlot {
  type: WeaponType;
  ammo: number;
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
}

export type CreatureType = 'angler' | 'squid' | 'serpent' | 'jellyfish' | 'fish' | 'leviathan';

export type DepthZone = 'sunlight' | 'twilight' | 'midnight' | 'abyssal' | 'hadal';

export interface TerrainSegment {
  points: Vec2[];
  type: 'wall' | 'cave' | 'trench' | 'ruin';
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'bubble' | 'biolum' | 'debris' | 'sonar';
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
  terrain: { left: Vec2[]; right: Vec2[] };
  particles: Particle[];
  sonarPings: SonarPing[];
  camera: Vec2;
  worldWidth: number;
  score: number;
  time: number;
  paused: boolean;
  gameOver: boolean;
  currentZone: DepthZone;
  deepestDepth: number;
  resources: Record<string, number>;
}

export interface ZoneConfig {
  name: string;
  zone: DepthZone;
  minDepth: number;
  maxDepth: number;
  waterColor: string;
  visibility: number; // light radius multiplier
  ambientLight: number; // 0-1
  creatureTypes: CreatureType[];
  creatureDensity: number;
  pressureDamage: number; // damage per second when exceeding safe depth
  terrainDensity: number;
}
