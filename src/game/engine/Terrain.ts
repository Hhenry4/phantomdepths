import { Vec2, TerrainFeature, DepthZone } from '../types';
import { WORLD_WIDTH, DEPTH_ZONES, TERRAIN_CHUNK_SIZE } from '../constants';

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

  // Advance rand to match position
  const warmupSteps = Math.floor(currentGenDepth / 20);
  for (let i = 0; i < warmupSteps % 100; i++) rand();

  generateTerrainChunk(rand, terrain.left, terrain.right, terrain.features, currentGenDepth, newMaxDepth);

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

  // Get last known positions
  let leftX = left.length > 0 ? left[left.length - 1].x : -WORLD_WIDTH / 2;
  let rightX = right.length > 0 ? right[right.length - 1].x : WORLD_WIDTH / 2;

  for (let i = startSeg; i <= endSeg; i++) {
    const y = i * segmentHeight;
    if (y < startDepth) continue;

    const depth = y;
    const zone = getZoneAtDepth(depth);
    const zoneConfig = DEPTH_ZONES.find(z => z.zone === zone);
    const density = zoneConfig?.terrainDensity ?? 0.5;

    // Gradually narrow with organic wave patterns
    const baseNarrowing = Math.min(depth / 20000 * 200, 400);
    const waveA = Math.sin(depth * 0.003) * 80;
    const waveB = Math.sin(depth * 0.0007) * 150;
    const jaggedness = 10 + density * 25;

    leftX = -WORLD_WIDTH / 2 + baseNarrowing + waveA + (rand() - 0.5) * jaggedness;
    rightX = WORLD_WIDTH / 2 - baseNarrowing + waveB + (rand() - 0.5) * jaggedness;

    // Cave systems - large open chambers
    if (rand() < 0.04 && depth > 100) {
      const caveSize = 150 + rand() * 300;
      leftX -= caveSize;
      rightX += caveSize;

      // Add cave entrance marker
      if (rand() < 0.6) {
        features.push({
          pos: { x: (leftX + rightX) / 2, y },
          type: 'cave',
          size: caveSize * 0.4,
          color: '#0a1520',
        });
      }
    }

    // Narrow passages (less frequent)
    if (rand() < 0.015 && depth > 500) {
      leftX += 60 + rand() * 80;
      rightX -= 60 + rand() * 80;
    }

    // Wider chambers
    if (rand() < 0.03 && depth > 300) {
      leftX -= 120 + rand() * 200;
      rightX += 120 + rand() * 200;
    }

    // Min passage width
    if (rightX - leftX < 250) {
      const center = (leftX + rightX) / 2;
      leftX = center - 125;
      rightX = center + 125;
    }

    left.push({ x: leftX, y });
    right.push({ x: rightX, y });

    // Terrain features - ocean-like
    if (depth > 30 && rand() < 0.015) {
      const passageWidth = rightX - leftX;
      const featureX = leftX + passageWidth * (0.15 + rand() * 0.7);

      if (depth < 300) {
        // Shallow: kelp forests, rock formations
        const ft = rand() < 0.5 ? 'kelp' : 'rock_formation';
        features.push({
          pos: { x: featureX, y },
          type: ft as TerrainFeature['type'],
          size: 15 + rand() * 25,
          color: ft === 'kelp' ? '#2d5a27' : '#4a5568',
        });
      } else if (depth < 1500) {
        // Mid depth: wrecks, rock formations
        const ft = rand() < 0.4 ? 'wreck' : 'rock_formation';
        features.push({
          pos: { x: featureX, y },
          type: ft as TerrainFeature['type'],
          size: 20 + rand() * 35,
          color: ft === 'wreck' ? '#4a6a7a' : '#3a4a58',
        });
      } else {
        // Deep: ruins, caves
        const ft = rand() < 0.5 ? 'ruin' : 'cave';
        features.push({
          pos: { x: featureX, y },
          type: ft as TerrainFeature['type'],
          size: 25 + rand() * 40,
          color: ft === 'ruin' ? '#8b7355' : '#0a1520',
        });
      }
    }

    // Treasure chests (coins!)
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

export function getZoneAtDepth(depth: number): DepthZone {
  for (const zone of DEPTH_ZONES) {
    if (depth >= zone.minDepth && depth < zone.maxDepth) {
      return zone.zone;
    }
  }
  return 'hadal';
}

export function getZoneConfig(depth: number) {
  for (const zone of DEPTH_ZONES) {
    if (depth >= zone.minDepth && depth < zone.maxDepth) {
      return zone;
    }
  }
  return DEPTH_ZONES[DEPTH_ZONES.length - 1];
}
