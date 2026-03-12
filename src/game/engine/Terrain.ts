import { Vec2, TerrainFeature, DepthZone } from '../types';
import { WORLD_WIDTH, MAX_DEPTH, DEPTH_ZONES } from '../constants';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateTerrain(seed: number = Date.now()): { left: Vec2[]; right: Vec2[]; features: TerrainFeature[] } {
  const rand = seededRandom(seed);
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  const features: TerrainFeature[] = [];

  const segmentHeight = 20;
  const segments = Math.ceil(MAX_DEPTH / segmentHeight);

  let leftX = -WORLD_WIDTH / 2;
  let rightX = WORLD_WIDTH / 2;

  for (let i = 0; i <= segments; i++) {
    const y = i * segmentHeight;
    const depth = y;
    const zone = getZoneAtDepth(depth);
    const zoneConfig = DEPTH_ZONES.find(z => z.zone === zone);
    const density = zoneConfig?.terrainDensity ?? 0.5;

    const narrowing = Math.min(depth / MAX_DEPTH * 200, 200);
    const jaggedness = 15 + density * 35;

    leftX = -WORLD_WIDTH / 2 + narrowing + (rand() - 0.5) * jaggedness;
    rightX = WORLD_WIDTH / 2 - narrowing + (rand() - 0.5) * jaggedness;

    // Caves
    if (rand() < 0.07 && depth > 100) {
      const caveSize = 100 + rand() * 200;
      leftX -= caveSize;
      rightX += caveSize;
      if (rand() < 0.5) {
        features.push({
          pos: { x: leftX + 40, y },
          type: 'cave',
          size: caveSize * 0.5,
          color: '#0a1520',
        });
      }
    }

    // Narrow passages
    if (rand() < 0.02 && depth > 500) {
      leftX += 40 + rand() * 60;
      rightX -= 40 + rand() * 60;
    }

    // Wider chambers
    if (rand() < 0.04 && depth > 300) {
      leftX -= 100 + rand() * 150;
      rightX += 100 + rand() * 150;
    }

    // Min passage width
    if (rightX - leftX < 200) {
      const center = (leftX + rightX) / 2;
      leftX = center - 100;
      rightX = center + 100;
    }

    left.push({ x: leftX, y });
    right.push({ x: rightX, y });

    // Spawn terrain features
    if (depth > 50 && rand() < 0.02) {
      const featureTypes: TerrainFeature['type'][] =
        depth < 200 ? ['coral', 'coral', 'coral'] :
        depth < 1000 ? ['coral', 'vent', 'wreck'] :
        depth < 4000 ? ['wreck', 'vent', 'crystal', 'ruin'] :
        ['ruin', 'crystal', 'vent', 'ruin'];

      const ft = featureTypes[Math.floor(rand() * featureTypes.length)];
      const featureColors: Record<string, string> = {
        coral: '#ff6b6b',
        vent: '#ff8c00',
        wreck: '#4a6a7a',
        crystal: '#00e5ff',
        ruin: '#8b7355',
      };
      features.push({
        pos: { x: (leftX + rightX) / 2 + (rand() - 0.5) * (rightX - leftX) * 0.6, y },
        type: ft,
        size: 15 + rand() * 30,
        color: featureColors[ft] || '#6a7a84',
      });
    }
  }

  return { left, right, features };
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
