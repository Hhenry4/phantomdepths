import { Vec2, DepthZone } from '../types';
import { WORLD_WIDTH, MAX_DEPTH, DEPTH_ZONES } from '../constants';

// Simple seeded random
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateTerrain(seed: number = Date.now()): { left: Vec2[]; right: Vec2[] } {
  const rand = seededRandom(seed);
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  
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
    
    // Terrain gets narrower and more jagged deeper down
    const narrowing = Math.min(depth / MAX_DEPTH * 200, 200);
    const jaggedness = 15 + density * 30;
    
    leftX = -WORLD_WIDTH / 2 + narrowing + (rand() - 0.5) * jaggedness;
    rightX = WORLD_WIDTH / 2 - narrowing + (rand() - 0.5) * jaggedness;
    
    // Occasional caves (wider sections)
    if (rand() < 0.05 && depth > 100) {
      leftX -= 60 + rand() * 80;
      rightX += 60 + rand() * 80;
    }
    
    // Occasional narrow passages
    if (rand() < 0.03 && depth > 500) {
      leftX += 40 + rand() * 60;
      rightX -= 40 + rand() * 60;
    }
    
    // Ensure minimum passage width
    if (rightX - leftX < 120) {
      const center = (leftX + rightX) / 2;
      leftX = center - 60;
      rightX = center + 60;
    }
    
    left.push({ x: leftX, y });
    right.push({ x: rightX, y });
  }
  
  return { left, right };
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
