import { Vec2, TerrainFeature, DepthZone } from '../types';
import { WORLD_WIDTH, DEPTH_ZONES, TERRAIN_CHUNK_SIZE, NPC_CONFIGS } from '../constants';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateTerrain(seed: number = Date.now(), maxDepth: number = 2000): { left: Vec2[]; right: Vec2[]; features: TerrainFeature[] } {
  const rand = seededRandom(seed);
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  const features: TerrainFeature[] = [];

  generateTerrainChunk(rand, left, right, features, 0, maxDepth);

  // Add NPCs
  for (const npc of NPC_CONFIGS) {
    if (npc.depth < maxDepth) {
      const passageWidth = WORLD_WIDTH * 0.5;
      features.push({
        pos: { x: (rand() - 0.5) * passageWidth, y: npc.depth },
        type: 'npc',
        size: 20,
        color: '#00ff88',
        npcName: npc.name,
        npcDialogue: npc.dialogue,
        questId: npc.questId,
      });
    }
  }

  return { left, right, features };
}

export function extendTerrain(
  terrain: { left: Vec2[]; right: Vec2[]; features: TerrainFeature[] },
  currentGenDepth: number,
  targetDepth: number,
  seed: number
): number {
  if (targetDepth <= currentGenDepth) return currentGenDepth;
  const newMaxDepth = targetDepth + TERRAIN_CHUNK_SIZE;
  const rand = seededRandom(seed + Math.floor(currentGenDepth));
  const warmupSteps = Math.floor(currentGenDepth / 20);
  for (let i = 0; i < warmupSteps % 100; i++) rand();
  generateTerrainChunk(rand, terrain.left, terrain.right, terrain.features, currentGenDepth, newMaxDepth);
  return newMaxDepth;
}

// === VOLCANIC TERRAIN ===
export function generateVolcanicTerrain(seed: number, maxDepth: number = 2000): { left: Vec2[]; right: Vec2[]; features: TerrainFeature[] } {
  const rand = seededRandom(seed);
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  const features: TerrainFeature[] = [];
  generateVolcanicChunk(rand, left, right, features, 0, maxDepth);
  return { left, right, features };
}

export function extendVolcanicTerrain(
  terrain: { left: Vec2[]; right: Vec2[]; features: TerrainFeature[] },
  currentGenDepth: number,
  targetDepth: number,
  seed: number
): number {
  if (targetDepth <= currentGenDepth) return currentGenDepth;
  const newMaxDepth = targetDepth + TERRAIN_CHUNK_SIZE;
  const rand = seededRandom(seed + 99999 + Math.floor(currentGenDepth));
  const warmupSteps = Math.floor(currentGenDepth / 20);
  for (let i = 0; i < warmupSteps % 100; i++) rand();
  generateVolcanicChunk(rand, terrain.left, terrain.right, terrain.features, currentGenDepth, newMaxDepth);
  return newMaxDepth;
}

function generateTerrainChunk(
  rand: () => number,
  left: Vec2[],
  right: Vec2[],
  features: TerrainFeature[],
  startDepth: number,
  endDepth: number
) {
  const segmentHeight = 20;
  const startSeg = Math.floor(startDepth / segmentHeight);
  const endSeg = Math.ceil(endDepth / segmentHeight);

  let leftX = left.length > 0 ? left[left.length - 1].x : -WORLD_WIDTH / 2;
  let rightX = right.length > 0 ? right[right.length - 1].x : WORLD_WIDTH / 2;

  for (let i = startSeg; i <= endSeg; i++) {
    const y = i * segmentHeight;
    if (y < startDepth) continue;

    const depth = y;
    const zone = getZoneAtDepth(depth);
    const zoneConfig = DEPTH_ZONES.find(z => z.zone === zone);
    const density = zoneConfig?.terrainDensity ?? 0.5;

    const baseNarrowing = Math.min(depth / 20000 * 200, 400);
    const waveA = Math.sin(depth * 0.003) * 80;
    const waveB = Math.sin(depth * 0.0007) * 150;
    const jaggedness = 10 + density * 25;

    leftX = -WORLD_WIDTH / 2 + baseNarrowing + waveA + (rand() - 0.5) * jaggedness;
    rightX = WORLD_WIDTH / 2 - baseNarrowing + waveB + (rand() - 0.5) * jaggedness;

    if (rand() < 0.04 && depth > 100) {
      const caveSize = 150 + rand() * 300;
      leftX -= caveSize;
      rightX += caveSize;
      if (rand() < 0.6) {
        features.push({ pos: { x: (leftX + rightX) / 2, y }, type: 'cave', size: caveSize * 0.4, color: '#0a1520' });
      }
    }

    if (rand() < 0.015 && depth > 500) {
      leftX += 60 + rand() * 80;
      rightX -= 60 + rand() * 80;
    }

    if (rand() < 0.03 && depth > 300) {
      leftX -= 120 + rand() * 200;
      rightX += 120 + rand() * 200;
    }

    if (rightX - leftX < 250) {
      const center = (leftX + rightX) / 2;
      leftX = center - 125;
      rightX = center + 125;
    }

    left.push({ x: leftX, y });
    right.push({ x: rightX, y });

    // Terrain features
    if (depth > 30 && rand() < 0.02) {
      const passageWidth = rightX - leftX;
      const featureX = leftX + passageWidth * (0.15 + rand() * 0.7);

      if (depth < 200) {
        // Shallow: coral and kelp
        const ft = rand() < 0.5 ? 'coral' : 'kelp';
        features.push({
          pos: { x: featureX, y },
          type: ft as TerrainFeature['type'],
          size: 15 + rand() * 25,
          color: ft === 'coral' ? getCoralColor(rand) : '#2d5a27',
        });
      } else if (depth < 500) {
        // Twilight: mix of coral, kelp, wrecks
        const r = rand();
        const ft = r < 0.3 ? 'coral' : r < 0.5 ? 'kelp' : r < 0.8 ? 'wreck' : 'cave';
        features.push({
          pos: { x: featureX, y },
          type: ft as TerrainFeature['type'],
          size: 20 + rand() * 30,
          color: ft === 'coral' ? getCoralColor(rand) : ft === 'kelp' ? '#2d5a27' : ft === 'wreck' ? '#4a6a7a' : '#0a1520',
        });
      } else if (depth < 2000) {
        const ft = rand() < 0.4 ? 'wreck' : 'cave';
        features.push({
          pos: { x: featureX, y },
          type: ft as TerrainFeature['type'],
          size: 20 + rand() * 35,
          color: ft === 'wreck' ? '#4a6a7a' : '#0a1520',
        });
      } else {
        const ft = rand() < 0.5 ? 'ruin' : 'cave';
        features.push({
          pos: { x: featureX, y },
          type: ft as TerrainFeature['type'],
          size: 25 + rand() * 40,
          color: ft === 'ruin' ? '#8b7355' : '#0a1520',
        });
      }
    }

    // Treasure chests
    if (rand() < 0.006 && depth > 50) {
      const passageWidth = rightX - leftX;
      const chestX = leftX + passageWidth * (0.2 + rand() * 0.6);
      const coinValue = depth < 500 ? 10 + Math.floor(rand() * 15) :
                        depth < 2000 ? 25 + Math.floor(rand() * 40) :
                        depth < 5000 ? 60 + Math.floor(rand() * 80) :
                        150 + Math.floor(rand() * 200);
      features.push({
        pos: { x: chestX, y },
        type: 'chest',
        size: 12 + rand() * 8,
        color: '#ffd700',
        collected: false,
        coinsValue: coinValue,
      });
    }
  }
}

function generateVolcanicChunk(
  rand: () => number,
  left: Vec2[],
  right: Vec2[],
  features: TerrainFeature[],
  startDepth: number,
  endDepth: number
) {
  const segmentHeight = 20;
  const startSeg = Math.floor(startDepth / segmentHeight);
  const endSeg = Math.ceil(endDepth / segmentHeight);

  let leftX = left.length > 0 ? left[left.length - 1].x : -WORLD_WIDTH / 2;
  let rightX = right.length > 0 ? right[right.length - 1].x : WORLD_WIDTH / 2;

  for (let i = startSeg; i <= endSeg; i++) {
    const y = i * segmentHeight;
    if (y < startDepth) continue;

    const depth = y;
    // Volcanic terrain is narrower, more claustrophobic
    const baseNarrowing = Math.min(depth / 8000 * 300, 600);
    const waveA = Math.sin(depth * 0.005) * 60;
    const waveB = Math.sin(depth * 0.001) * 100;
    const jaggedness = 20 + 30 * Math.min(1, depth / 3000);

    leftX = -WORLD_WIDTH / 2 + baseNarrowing + waveA + (rand() - 0.5) * jaggedness;
    rightX = WORLD_WIDTH / 2 - baseNarrowing + waveB + (rand() - 0.5) * jaggedness;

    // Lava tunnels - narrow passages
    if (rand() < 0.03 && depth > 200) {
      leftX += 100 + rand() * 120;
      rightX -= 100 + rand() * 120;
    }

    // Volcanic craters - wide open
    if (rand() < 0.02 && depth > 500) {
      leftX -= 200 + rand() * 300;
      rightX += 200 + rand() * 300;
    }

    // Min passage width
    if (rightX - leftX < 300) {
      const center = (leftX + rightX) / 2;
      leftX = center - 150;
      rightX = center + 150;
    }

    left.push({ x: leftX, y });
    right.push({ x: rightX, y });

    const passageWidth = rightX - leftX;
    const featureX = leftX + passageWidth * (0.15 + rand() * 0.7);

    // Hydrothermal vents
    if (rand() < 0.012 && depth > 50) {
      features.push({
        pos: { x: featureX, y },
        type: 'vent',
        size: 30 + rand() * 20,
        color: '#333333',
        active: rand() < 0.7,
        pulseTimer: Math.floor(rand() * 200),
      });
    }

    // Lava fissures
    if (rand() < 0.01 && depth > 100) {
      features.push({
        pos: { x: featureX, y },
        type: 'fissure',
        size: 40 + rand() * 60,
        color: '#ff2200',
        eruptTimer: 200 + rand() * 400,
      });
    }

    // Basalt pillars
    if (rand() < 0.015 && depth > 150) {
      features.push({
        pos: { x: featureX, y },
        type: 'basalt_pillar',
        size: 25 + rand() * 40,
        color: '#2a2a2a',
      });
    }

    // Ash clouds
    if (rand() < 0.008 && depth > 200) {
      features.push({
        pos: { x: featureX, y },
        type: 'ash_cloud',
        size: 60 + rand() * 80,
        color: '#555555',
      });
    }

    // Chests in volcanic too
    if (rand() < 0.005 && depth > 100) {
      const chestX = leftX + passageWidth * (0.2 + rand() * 0.6);
      features.push({
        pos: { x: chestX, y },
        type: 'chest',
        size: 14,
        color: '#ffd700',
        collected: false,
        coinsValue: 80 + Math.floor(rand() * 150),
      });
    }
  }
}

function getCoralColor(rand: () => number): string {
  const colors = ['#ff6b6b', '#ff8e53', '#e84393', '#fd79a8', '#fab1a0', '#ff7675', '#e17055', '#d63031'];
  return colors[Math.floor(rand() * colors.length)];
}

export function getZoneAtDepth(depth: number): DepthZone {
  for (const zone of DEPTH_ZONES) {
    if (zone.zone === 'volcanic') continue; // Skip volcanic in normal lookup
    if (depth >= zone.minDepth && depth < zone.maxDepth) {
      return zone.zone;
    }
  }
  return 'hadal';
}

export function getZoneConfig(depth: number) {
  for (const zone of DEPTH_ZONES) {
    if (zone.zone === 'volcanic') continue;
    if (depth >= zone.minDepth && depth < zone.maxDepth) {
      return zone;
    }
  }
  return DEPTH_ZONES[DEPTH_ZONES.length - 2]; // hadal, not volcanic
}

export function getVolcanicZoneConfig() {
  return DEPTH_ZONES.find(z => z.zone === 'volcanic')!;
}
