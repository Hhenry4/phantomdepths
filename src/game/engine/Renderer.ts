import { GameState, Creature, SonarPing, Vec2, Particle, Projectile, TerrainFeature } from '../types';
import { SUB_WIDTH, SUB_HEIGHT, LIGHT_RADIUS_BASE, DEPTH_ZONES } from '../constants';
import { getZoneConfig, getVolcanicZoneConfig } from './Terrain';
import { PlayerData } from '../../firebase/multiplayer';

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasW: number,
  canvasH: number,
  otherPlayers?: Record<string, PlayerData>,
  lightLevel?: number,
) {
  const { sub, camera } = state;
  const isVolcanic = state.currentMap === 'volcanic';
  const zoneConfig = isVolcanic ? getVolcanicZoneConfig() : getZoneConfig(sub.depth);

  // Ocean gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
  if (isVolcanic) {
    bgGrad.addColorStop(0, '#1a0800');
    bgGrad.addColorStop(0.5, '#0d0400');
    bgGrad.addColorStop(1, '#050200');
  } else {
    bgGrad.addColorStop(0, zoneConfig.waterColor);
    bgGrad.addColorStop(1, darkenColor(zoneConfig.waterColor, 0.3));
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Underwater current lines (or heat distortion for volcanic)
  if (isVolcanic) {
    drawHeatDistortion(ctx, state, canvasW, canvasH);
  } else {
    drawCurrents(ctx, state, canvasW, canvasH);
  }

  ctx.save();
  ctx.translate(canvasW / 2 - camera.x, canvasH / 2 - camera.y);

  if (!isVolcanic) drawWaterSurface(ctx, camera, canvasW);
  drawTerrainFeatures(ctx, state.terrain.features, camera, canvasH, state.time);
  drawParticles(ctx, state.particles);
  state.creatures.forEach(c => drawCreature(ctx, c, sub.depth));
  drawProjectiles(ctx, state.projectiles);
  state.sonarPings.forEach(p => drawSonarPing(ctx, p));

  // Portal
  if (state.portalActive && state.portalPos) {
    drawPortal(ctx, state.portalPos, state.time);
  }

  // Other players
  if (otherPlayers) {
    for (const [id, player] of Object.entries(otherPlayers)) {
      if (player.alive) drawOtherPlayer(ctx, player);
    }
  }

  drawAimLine(ctx, sub.pos, sub.aimAngle);
  drawSubmarine(ctx, sub.pos, sub.rotation, sub.lightOn, sub.hull, sub.maxHull, sub.aimAngle, sub.heat, sub.maxHeat);

  ctx.restore();

  // System glitch overlay
  if (sub.systemGlitch) {
    ctx.fillStyle = `rgba(0, 255, 100, ${0.03 + Math.random() * 0.05})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
    // Scanlines
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < canvasH; y += 3) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.random() * 2);
      ctx.lineTo(canvasW, y + Math.random() * 2);
      ctx.stroke();
    }
  }

  const effectiveLightLevel = lightLevel ?? 0;
  const lightRadiusMult = 1 + effectiveLightLevel * 0.3;
  const volcVisBoost = isVolcanic ? 1.3 : 1;
  drawDarknessOverlay(ctx, canvasW, canvasH, zoneConfig.ambientLight, zoneConfig.visibility * lightRadiusMult * volcVisBoost, sub.lightOn);
  drawMinimap(ctx, state, canvasW, canvasH, otherPlayers);
}

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`;
}

function drawCurrents(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number) {
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#b4c5cf';
  ctx.lineWidth = 1;
  const t = state.time * 0.5;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    const y = (i / 8) * ch;
    ctx.moveTo(0, y);
    for (let x = 0; x < cw; x += 20) {
      ctx.lineTo(x, y + Math.sin(x * 0.01 + t * 0.02 + i) * 15);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawHeatDistortion(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number) {
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#ff440040';
  ctx.lineWidth = 2;
  const t = state.time * 0.3;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const y = (i / 5) * ch;
    for (let x = 0; x < cw; x += 15) {
      ctx.lineTo(x, y + Math.sin(x * 0.008 + t * 0.03 + i * 2) * 20 + Math.sin(x * 0.02 + t * 0.01) * 8);
    }
    ctx.stroke();
  }
  // Ambient glow from below
  const glowGrad = ctx.createLinearGradient(0, ch * 0.6, 0, ch);
  glowGrad.addColorStop(0, 'rgba(255, 68, 0, 0)');
  glowGrad.addColorStop(1, 'rgba(255, 68, 0, 0.08)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, ch * 0.6, cw, ch * 0.4);
  ctx.globalAlpha = 1;
}

function drawWaterSurface(ctx: CanvasRenderingContext2D, camera: Vec2, canvasW: number) {
  const viewLeft = camera.x - canvasW;
  const viewWidth = canvasW * 3;
  const t = Date.now() * 0.001;

  const skyGrad = ctx.createLinearGradient(0, -600, 0, -5);
  skyGrad.addColorStop(0, '#87ceeb');
  skyGrad.addColorStop(0.6, '#b4dff0');
  skyGrad.addColorStop(1, '#d4eff8');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(viewLeft, -2000, viewWidth, 2000);

  ctx.beginPath();
  ctx.moveTo(viewLeft, 10);
  for (let x = viewLeft; x <= viewLeft + viewWidth; x += 8) {
    const waveY = Math.sin(x * 0.015 + t * 1.5) * 3 + Math.sin(x * 0.03 + t * 2.2) * 1.5;
    ctx.lineTo(x, waveY);
  }
  ctx.lineTo(viewLeft + viewWidth, -2000);
  ctx.lineTo(viewLeft, -2000);
  ctx.closePath();
  ctx.fillStyle = '#d4eff8';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = viewLeft; x <= viewLeft + viewWidth; x += 8) {
    const waveY = Math.sin(x * 0.015 + t * 1.5) * 3 + Math.sin(x * 0.03 + t * 2.2) * 1.5;
    if (x === viewLeft) ctx.moveTo(x, waveY); else ctx.lineTo(x, waveY);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  for (let x = viewLeft; x <= viewLeft + viewWidth; x += 60) {
    const waveY = Math.sin(x * 0.015 + t * 1.5) * 3;
    const foamW = 15 + Math.sin(x * 0.1 + t) * 8;
    ctx.beginPath();
    ctx.ellipse(x, waveY + 1, foamW, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#87ceeb';
  for (let i = 0; i < 6; i++) {
    const rx = viewLeft + (i + 0.5) * (viewWidth / 6) + Math.sin(t + i) * 30;
    ctx.beginPath();
    ctx.moveTo(rx - 8, 0);
    ctx.lineTo(rx + 8, 0);
    ctx.lineTo(rx + 40 + Math.sin(t * 0.5 + i) * 20, 250);
    ctx.lineTo(rx - 40 + Math.sin(t * 0.7 + i) * 20, 250);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPortal(ctx: CanvasRenderingContext2D, pos: Vec2, time: number) {
  const t = time * 0.05;
  const radius = 50 + Math.sin(t) * 10;

  // Outer glow
  const outerGlow = ctx.createRadialGradient(pos.x, pos.y, radius * 0.3, pos.x, pos.y, radius * 2);
  outerGlow.addColorStop(0, 'rgba(255, 68, 0, 0.4)');
  outerGlow.addColorStop(0.5, 'rgba(255, 30, 0, 0.15)');
  outerGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius * 2, 0, Math.PI * 2);
  ctx.fill();

  // Swirling vortex
  ctx.strokeStyle = '#ff4400';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const angle = t * 2 + i * Math.PI / 2;
    ctx.beginPath();
    for (let j = 0; j < 20; j++) {
      const a = angle + j * 0.3;
      const r = radius * 0.2 + j * radius * 0.04;
      const x = pos.x + Math.cos(a) * r;
      const y = pos.y + Math.sin(a) * r;
      if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Core
  const coreGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 0.4);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.3, '#ff8800');
  coreGrad.addColorStop(1, '#ff220080');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#ff8800';
  ctx.font = 'bold 12px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ VOLCANIC ABYSS ⚡', pos.x, pos.y - radius - 15);
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#ff660080';
  ctx.fillText('Enter the portal', pos.x, pos.y - radius - 3);
  ctx.textAlign = 'start';
}

function drawAimLine(ctx: CanvasRenderingContext2D, pos: Vec2, aimAngle: number) {
  ctx.strokeStyle = 'rgba(0, 191, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(pos.x + Math.cos(aimAngle) * 40, pos.y + Math.sin(aimAngle) * 40);
  ctx.lineTo(pos.x + Math.cos(aimAngle) * 120, pos.y + Math.sin(aimAngle) * 120);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0, 191, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(pos.x + Math.cos(aimAngle) * 120, pos.y + Math.sin(aimAngle) * 120, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawOtherPlayer(ctx: CanvasRenderingContext2D, player: PlayerData) {
  const { x, y, rotation } = player.odometry;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = '#1a3a4a';
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, SUB_WIDTH / 2, SUB_HEIGHT / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#00ff88';
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(player.name, x, y - 25);
  ctx.textAlign = 'start';
}

function drawTerrainFeatures(ctx: CanvasRenderingContext2D, features: TerrainFeature[], camera: Vec2, ch: number, time: number) {
  const viewTop = camera.y - ch / 2 - 100;
  const viewBottom = camera.y + ch / 2 + 100;

  for (const f of features) {
    if (f.pos.y < viewTop - 50 || f.pos.y > viewBottom + 50) continue;

    ctx.globalAlpha = 0.8;
    switch (f.type) {
      case 'kelp': drawKelp(ctx, f); break;
      case 'coral': drawCoral(ctx, f); break;
      case 'cave': drawCaveEntrance(ctx, f); break;
      case 'wreck': drawDetailedWreck(ctx, f); break;
      case 'ruin': drawRuin(ctx, f); break;
      case 'chest': if (!f.collected) drawChest(ctx, f); break;
      case 'npc': drawNPC(ctx, f, time); break;
      case 'vent': drawHydrothermalVent(ctx, f, time); break;
      case 'fissure': drawLavaFissure(ctx, f, time); break;
      case 'basalt_pillar': drawBasaltPillar(ctx, f); break;
      case 'ash_cloud': drawAshCloud(ctx, f, time); break;
    }
    ctx.globalAlpha = 1;
  }
}

// === ENHANCED CORAL ===
function drawCoral(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  const t = Date.now() * 0.001;
  // Multiple coral branches
  for (let b = 0; b < 5; b++) {
    const ox = (b - 2) * f.size * 0.25;
    const height = f.size * (0.5 + Math.sin(b * 2.1) * 0.3);
    const sway = Math.sin(t + b * 0.7) * 3;

    ctx.strokeStyle = f.color;
    ctx.lineWidth = 3 + b % 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.pos.x + ox, f.pos.y);
    // Organic branching
    const midX = f.pos.x + ox + sway;
    const midY = f.pos.y - height * 0.6;
    ctx.quadraticCurveTo(midX, midY, f.pos.x + ox + sway * 1.5 + (b - 2) * 3, f.pos.y - height);
    ctx.stroke();

    // Branch tips - little bulbs
    ctx.fillStyle = f.color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(f.pos.x + ox + sway * 1.5 + (b - 2) * 3, f.pos.y - height, 3 + b % 2, 0, Math.PI * 2);
    ctx.fill();

    // Sub-branches
    if (b % 2 === 0) {
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.quadraticCurveTo(midX + 10, midY - 8, midX + 15 + sway, midY - 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(midX + 15 + sway, midY - 12, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 0.8;
}

function drawKelp(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  ctx.strokeStyle = f.color;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const ox = (i - 1.5) * 6;
    ctx.beginPath();
    ctx.moveTo(f.pos.x + ox, f.pos.y);
    const t = Date.now() * 0.002;
    for (let j = 1; j <= 6; j++) {
      const wave = Math.sin(t + j * 0.8 + i) * 6;
      ctx.lineTo(f.pos.x + ox + wave, f.pos.y - j * f.size * 0.15);
    }
    ctx.stroke();
    // Leaf blobs at intervals
    ctx.fillStyle = f.color;
    for (let j = 2; j <= 5; j += 2) {
      const wave = Math.sin(t + j * 0.8 + i) * 6;
      ctx.beginPath();
      ctx.ellipse(f.pos.x + ox + wave, f.pos.y - j * f.size * 0.15, 5, 3, Math.sin(t + i) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCaveEntrance(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  const gradient = ctx.createRadialGradient(f.pos.x, f.pos.y, f.size * 0.1, f.pos.x, f.pos.y, f.size);
  gradient.addColorStop(0, '#000000');
  gradient.addColorStop(0.6, '#0a0e14');
  gradient.addColorStop(1, '#0a0e1400');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(f.pos.x, f.pos.y, f.size, f.size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stalactites with more detail
  ctx.fillStyle = '#1a2a3a';
  for (let i = 0; i < 5; i++) {
    const sx = f.pos.x + (i - 2) * f.size * 0.25;
    const h = f.size * 0.2 + Math.sin(i * 1.7) * f.size * 0.1;
    ctx.beginPath();
    ctx.moveTo(sx - 3, f.pos.y - f.size * 0.5);
    ctx.lineTo(sx, f.pos.y - f.size * 0.5 + h);
    ctx.lineTo(sx + 3, f.pos.y - f.size * 0.5);
    ctx.fill();
  }
}

// === DETAILED SHIPWRECK ===
function drawDetailedWreck(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  const s = f.size;
  const x = f.pos.x;
  const y = f.pos.y;

  // Hull - curved ship shape
  ctx.fillStyle = '#2a3a4a';
  ctx.strokeStyle = '#4a6a7a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - s, y + s * 0.3);
  ctx.quadraticCurveTo(x - s * 0.9, y - s * 0.3, x - s * 0.5, y - s * 0.4);
  ctx.lineTo(x + s * 0.6, y - s * 0.35);
  ctx.quadraticCurveTo(x + s * 0.9, y - s * 0.2, x + s, y + s * 0.15);
  ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.45, x - s * 0.5, y + s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Broken mast
  ctx.strokeStyle = '#3a5060';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, y - s * 0.35);
  ctx.lineTo(x + s * 0.05, y - s);
  ctx.stroke();

  // Crow's nest (broken)
  ctx.strokeStyle = '#4a6a7a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.08, y - s * 0.85);
  ctx.lineTo(x + s * 0.18, y - s * 0.85);
  ctx.stroke();

  // Rigging remnants
  ctx.strokeStyle = '#3a5a6a40';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.05, y - s * 0.9);
  ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.5, x + s * 0.7, y - s * 0.2);
  ctx.stroke();

  // Portholes with glass
  const portholes = [
    { px: x - s * 0.4, py: y - s * 0.05 },
    { px: x - s * 0.1, py: y - s * 0.15 },
    { px: x + s * 0.2, py: y - s * 0.12 },
    { px: x + s * 0.5, py: y - s * 0.05 },
  ];
  for (const p of portholes) {
    ctx.fillStyle = '#0a1520';
    ctx.beginPath();
    ctx.arc(p.px, p.py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a8a9a';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Glass reflection
    ctx.fillStyle = '#4a8aaa20';
    ctx.beginPath();
    ctx.arc(p.px - 1, p.py - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hull planks
  ctx.strokeStyle = '#3a5060';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const ly = y - s * 0.2 + i * s * 0.12;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.7, ly);
    ctx.lineTo(x + s * 0.6, ly);
    ctx.stroke();
  }

  // Barnacles/growth
  ctx.fillStyle = '#2d5a27';
  for (let i = 0; i < 6; i++) {
    const bx = x - s * 0.6 + i * s * 0.25 + Math.sin(i * 3.1) * 5;
    const by = y + s * 0.2 + Math.cos(i * 2.3) * 5;
    ctx.beginPath();
    ctx.arc(bx, by, 2 + Math.sin(i) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRuin(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  ctx.strokeStyle = f.color;
  ctx.fillStyle = f.color + '40';
  ctx.lineWidth = 2;

  // Column with capital
  ctx.strokeRect(f.pos.x - 5, f.pos.y - f.size * 0.8, 10, f.size * 0.8);
  ctx.fillRect(f.pos.x - 8, f.pos.y - f.size * 0.82, 16, 4);

  // Broken column
  ctx.strokeRect(f.pos.x + f.size * 0.4, f.pos.y - f.size * 0.4, 8, f.size * 0.4);

  // Arch
  ctx.beginPath();
  ctx.arc(f.pos.x + f.size * 0.2, f.pos.y - f.size * 0.8, f.size * 0.25, Math.PI, 0);
  ctx.stroke();

  // Mystery glow
  const glowGrad = ctx.createRadialGradient(f.pos.x + f.size * 0.2, f.pos.y - f.size * 0.5, 0, f.pos.x + f.size * 0.2, f.pos.y - f.size * 0.5, f.size * 0.3);
  glowGrad.addColorStop(0, '#e0b0ff15');
  glowGrad.addColorStop(1, '#e0b0ff00');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(f.pos.x + f.size * 0.2, f.pos.y - f.size * 0.5, f.size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Inscriptions
  ctx.strokeStyle = f.color + '30';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(f.pos.x - 3 + i * 3, f.pos.y - f.size * 0.5 + i * 8);
    ctx.lineTo(f.pos.x - 3 + i * 3 + 6, f.pos.y - f.size * 0.5 + i * 8);
    ctx.stroke();
  }
}

// === NPC ===
function drawNPC(ctx: CanvasRenderingContext2D, f: TerrainFeature, time: number) {
  const bob = Math.sin(time * 0.03 + f.pos.x * 0.01) * 4;
  const x = f.pos.x;
  const y = f.pos.y + bob;

  // Beacon glow
  const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, 40);
  glowGrad.addColorStop(0, 'rgba(0, 255, 136, 0.2)');
  glowGrad.addColorStop(1, 'rgba(0, 255, 136, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, Math.PI * 2);
  ctx.fill();

  // NPC body - diving suit
  ctx.fillStyle = '#1a3a4a';
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Helmet
  ctx.fillStyle = '#0a2030';
  ctx.beginPath();
  ctx.arc(x, y - 8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00ff8880';
  ctx.stroke();

  // Visor
  ctx.fillStyle = '#00bfff60';
  ctx.beginPath();
  ctx.arc(x + 2, y - 9, 3, 0, Math.PI * 2);
  ctx.fill();

  // Quest marker
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('!', x, y - 22);

  // Name
  ctx.fillStyle = '#00ff88';
  ctx.font = '8px "IBM Plex Mono", monospace';
  ctx.fillText(f.npcName || 'NPC', x, y + 22);
  ctx.textAlign = 'start';
}

// === VOLCANIC FEATURES ===
function drawHydrothermalVent(ctx: CanvasRenderingContext2D, f: TerrainFeature, time: number) {
  const t = time * 0.05;
  const pulsing = f.active && Math.sin(t + f.pos.x * 0.01) > 0;

  // Chimney base
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(f.pos.x - f.size * 0.4, f.pos.y);
  ctx.lineTo(f.pos.x - f.size * 0.25, f.pos.y - f.size);
  ctx.lineTo(f.pos.x + f.size * 0.25, f.pos.y - f.size);
  ctx.lineTo(f.pos.x + f.size * 0.4, f.pos.y);
  ctx.closePath();
  ctx.fill();

  // Chimney texture
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const ly = f.pos.y - f.size * (0.2 + i * 0.2);
    ctx.beginPath();
    ctx.moveTo(f.pos.x - f.size * 0.3 + i * 2, ly);
    ctx.lineTo(f.pos.x + f.size * 0.3 - i * 2, ly);
    ctx.stroke();
  }

  // Vent opening with glow
  if (pulsing) {
    const ventGlow = ctx.createRadialGradient(f.pos.x, f.pos.y - f.size, 0, f.pos.x, f.pos.y - f.size, f.size * 0.6);
    ventGlow.addColorStop(0, 'rgba(255, 100, 0, 0.6)');
    ventGlow.addColorStop(0.5, 'rgba(255, 50, 0, 0.2)');
    ventGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = ventGlow;
    ctx.beginPath();
    ctx.arc(f.pos.x, f.pos.y - f.size, f.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hot water jet
  ctx.strokeStyle = pulsing ? '#ff660040' : '#44444430';
  ctx.lineWidth = pulsing ? 4 : 2;
  ctx.beginPath();
  ctx.moveTo(f.pos.x, f.pos.y - f.size);
  const jetHeight = pulsing ? f.size * 1.5 : f.size * 0.5;
  ctx.quadraticCurveTo(f.pos.x + Math.sin(t * 3) * 10, f.pos.y - f.size - jetHeight * 0.5, f.pos.x + Math.sin(t * 2) * 15, f.pos.y - f.size - jetHeight);
  ctx.stroke();
}

function drawLavaFissure(ctx: CanvasRenderingContext2D, f: TerrainFeature, time: number) {
  const t = time * 0.03;
  const glowIntensity = 0.5 + Math.sin(t + f.pos.x * 0.01) * 0.3;

  // Fissure glow from below
  const fissureGlow = ctx.createRadialGradient(f.pos.x, f.pos.y, 0, f.pos.x, f.pos.y, f.size);
  fissureGlow.addColorStop(0, `rgba(255, 50, 0, ${glowIntensity * 0.4})`);
  fissureGlow.addColorStop(0.5, `rgba(255, 20, 0, ${glowIntensity * 0.15})`);
  fissureGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
  ctx.fillStyle = fissureGlow;
  ctx.beginPath();
  ctx.arc(f.pos.x, f.pos.y, f.size, 0, Math.PI * 2);
  ctx.fill();

  // Crack lines
  ctx.strokeStyle = `rgba(255, 80, 0, ${glowIntensity})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(f.pos.x - f.size * 0.8, f.pos.y + Math.sin(f.pos.x * 0.1) * 5);
  ctx.lineTo(f.pos.x - f.size * 0.3, f.pos.y + Math.sin(f.pos.x * 0.2 + 1) * 3);
  ctx.lineTo(f.pos.x + f.size * 0.2, f.pos.y + Math.sin(f.pos.x * 0.15 + 2) * 4);
  ctx.lineTo(f.pos.x + f.size * 0.8, f.pos.y + Math.sin(f.pos.x * 0.12 + 3) * 6);
  ctx.stroke();

  // Inner bright line
  ctx.strokeStyle = `rgba(255, 200, 50, ${glowIntensity * 0.5})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(f.pos.x - f.size * 0.6, f.pos.y);
  ctx.lineTo(f.pos.x + f.size * 0.6, f.pos.y);
  ctx.stroke();
}

function drawBasaltPillar(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  const x = f.pos.x;
  const y = f.pos.y;
  const s = f.size;

  // Hexagonal-ish pillar
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;

  // Main pillar
  ctx.beginPath();
  ctx.moveTo(x - s * 0.2, y);
  ctx.lineTo(x - s * 0.25, y - s);
  ctx.lineTo(x - s * 0.1, y - s * 1.1);
  ctx.lineTo(x + s * 0.1, y - s * 1.1);
  ctx.lineTo(x + s * 0.25, y - s);
  ctx.lineTo(x + s * 0.2, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Side pillar
  ctx.beginPath();
  ctx.moveTo(x + s * 0.2, y);
  ctx.lineTo(x + s * 0.3, y - s * 0.7);
  ctx.lineTo(x + s * 0.45, y - s * 0.65);
  ctx.lineTo(x + s * 0.4, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Horizontal cracks
  ctx.strokeStyle = '#2a2a2a';
  for (let i = 0; i < 4; i++) {
    const ly = y - s * (0.2 + i * 0.25);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.2, ly);
    ctx.lineTo(x + s * 0.2, ly);
    ctx.stroke();
  }
}

function drawAshCloud(ctx: CanvasRenderingContext2D, f: TerrainFeature, time: number) {
  const t = time * 0.02;
  ctx.globalAlpha = 0.25 + Math.sin(t + f.pos.x * 0.01) * 0.1;

  for (let i = 0; i < 4; i++) {
    const ox = Math.sin(t + i * 1.5) * f.size * 0.3;
    const oy = Math.cos(t * 0.7 + i * 2) * f.size * 0.2;
    const r = f.size * (0.4 + i * 0.15);

    const cloudGrad = ctx.createRadialGradient(f.pos.x + ox, f.pos.y + oy, 0, f.pos.x + ox, f.pos.y + oy, r);
    cloudGrad.addColorStop(0, '#55555580');
    cloudGrad.addColorStop(1, '#55555500');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.arc(f.pos.x + ox, f.pos.y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.8;
}

function drawChest(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  const bob = Math.sin(Date.now() * 0.003 + f.pos.x) * 3;
  const cx = f.pos.x;
  const cy = f.pos.y + bob;

  ctx.fillStyle = '#ffd70020';
  ctx.beginPath();
  ctx.arc(cx, cy, f.size * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8b6914';
  ctx.fillRect(cx - f.size * 0.6, cy - f.size * 0.3, f.size * 1.2, f.size * 0.6);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - f.size * 0.6, cy - f.size * 0.3, f.size * 1.2, f.size * 0.6);

  ctx.beginPath();
  ctx.arc(cx, cy - f.size * 0.3, f.size * 0.6, Math.PI, 0);
  ctx.fillStyle = '#a07818';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();

  const sparkle = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
  ctx.globalAlpha = sparkle * 0.6;
  ctx.beginPath();
  ctx.arc(cx + f.size * 0.4, cy - f.size * 0.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;
}

function drawSubmarine(ctx: CanvasRenderingContext2D, pos: Vec2, rotation: number, lightOn: boolean, hull: number, maxHull: number, aimAngle: number, heat: number, maxHeat: number) {
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);

  const hullRatio = hull / maxHull;
  const hullColor = hullRatio > 0.6 ? '#b4c5cf' : hullRatio > 0.3 ? '#ff8c00' : '#ff4500';
  const isOverheating = heat > 60;

  // Hull glow when overheating
  if (isOverheating) {
    const heatGlow = ctx.createRadialGradient(0, 0, SUB_WIDTH * 0.3, 0, 0, SUB_WIDTH);
    heatGlow.addColorStop(0, `rgba(255, 68, 0, ${(heat / maxHeat) * 0.15})`);
    heatGlow.addColorStop(1, 'rgba(255, 68, 0, 0)');
    ctx.fillStyle = heatGlow;
    ctx.beginPath();
    ctx.arc(0, 0, SUB_WIDTH, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main hull
  ctx.fillStyle = isOverheating ? '#2a1a10' : '#1a2a3a';
  ctx.strokeStyle = hullColor;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.ellipse(0, 0, SUB_WIDTH / 2, SUB_HEIGHT / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hull plating detail
  ctx.strokeStyle = hullColor + '20';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-SUB_WIDTH * 0.15, -SUB_HEIGHT / 2);
  ctx.lineTo(-SUB_WIDTH * 0.15, SUB_HEIGHT / 2);
  ctx.moveTo(SUB_WIDTH * 0.05, -SUB_HEIGHT / 2);
  ctx.lineTo(SUB_WIDTH * 0.05, SUB_HEIGHT / 2);
  ctx.moveTo(-SUB_WIDTH * 0.3, -SUB_HEIGHT / 2);
  ctx.lineTo(-SUB_WIDTH * 0.3, SUB_HEIGHT / 2);
  ctx.stroke();

  // Conning tower
  ctx.fillStyle = isOverheating ? '#2a1510' : '#1e3040';
  ctx.beginPath();
  ctx.moveTo(-6, -SUB_HEIGHT / 2);
  ctx.lineTo(-3, -SUB_HEIGHT / 2 - 10);
  ctx.lineTo(8, -SUB_HEIGHT / 2 - 10);
  ctx.lineTo(10, -SUB_HEIGHT / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hullColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Periscope
  ctx.strokeStyle = '#4a6a7a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(3, -SUB_HEIGHT / 2 - 10);
  ctx.lineTo(3, -SUB_HEIGHT / 2 - 15);
  ctx.lineTo(7, -SUB_HEIGHT / 2 - 15);
  ctx.stroke();

  // Propeller housing + blades
  ctx.fillStyle = '#0f1a24';
  ctx.beginPath();
  ctx.ellipse(-SUB_WIDTH / 2 - 4, 0, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const propAngle = Date.now() * 0.02;
  ctx.strokeStyle = '#3a5a6a';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a = propAngle + i * Math.PI * 2 / 3;
    ctx.beginPath();
    ctx.moveTo(-SUB_WIDTH / 2 - 4, 0);
    ctx.lineTo(-SUB_WIDTH / 2 - 4 + Math.cos(a) * 8, Math.sin(a) * 8);
    ctx.stroke();
  }

  // Nose window
  ctx.fillStyle = lightOn ? '#00bfff' : '#1a4a6e';
  ctx.beginPath();
  ctx.arc(SUB_WIDTH / 4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  if (lightOn) {
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Damage cracks
  if (hullRatio < 0.6) {
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1 - hullRatio;
    const crackCount = Math.floor((1 - hullRatio) * 8);
    for (let i = 0; i < crackCount; i++) {
      const seed = i * 7.31;
      const cx = Math.sin(seed) * SUB_WIDTH * 0.3;
      const cy = Math.cos(seed * 1.7) * SUB_HEIGHT * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.sin(seed * 2.3) * 12, cy + Math.cos(seed * 3.1) * 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // Turret
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(aimAngle);
  ctx.strokeStyle = '#00bfff80';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(35, 0);
  ctx.stroke();
  ctx.fillStyle = '#1a3a4a';
  ctx.strokeStyle = '#00bfff60';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(18, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCreature(ctx: CanvasRenderingContext2D, creature: Creature, subDepth: number) {
  const { pos, size, color, glowColor, type, state: cState, health, maxHealth, isBoss } = creature;

  if (creature.submerged) return; // Hidden during lava dive

  if (isBoss) {
    const auraGrad = ctx.createRadialGradient(pos.x, pos.y, size * 0.5, pos.x, pos.y, size * 2.5);
    auraGrad.addColorStop(0, glowColor + '30');
    auraGrad.addColorStop(1, glowColor + '00');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    const barW = size * 2;
    const barH = 4;
    const barY = pos.y - size - 15;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(pos.x - barW / 2, barY, barW, barH);
    ctx.fillStyle = type === 'infernal_leviathan' ? '#ff4400' : '#ff4500';
    ctx.fillRect(pos.x - barW / 2, barY, barW * (health / maxHealth), barH);
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x - barW / 2, barY, barW, barH);

    ctx.fillStyle = '#ff4500';
    ctx.font = 'bold 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    const bossName = type === 'infernal_leviathan' ? 'INFERNAL LEVIATHAN' : `BOSS: ${type.toUpperCase()}`;
    ctx.fillText(bossName, pos.x, barY - 5);
    ctx.textAlign = 'start';
  }

  const glowRadius = size * 1.5;
  const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowRadius);
  gradient.addColorStop(0, glowColor + '40');
  gradient.addColorStop(1, glowColor + '00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = isBoss ? 2.5 : 1.5;

  switch (type) {
    case 'fish': drawFish(ctx, pos, size, creature.vel); break;
    case 'jellyfish': drawJellyfish(ctx, pos, size); break;
    case 'angler': drawAngler(ctx, pos, size, creature.vel); break;
    case 'eel': drawEel(ctx, pos, size, creature.vel); break;
    case 'squid': drawSquid(ctx, pos, size, creature.vel); break;
    case 'serpent': drawSerpent(ctx, pos, size); break;
    case 'leviathan': drawLeviathan(ctx, pos, size); break;
    case 'phantom': drawPhantom(ctx, pos, size); break;
    case 'lava_eel': drawLavaEel(ctx, pos, size, creature.vel); break;
    case 'vent_crab': drawVentCrab(ctx, pos, size, creature.vel); break;
    case 'magma_ray': drawMagmaRay(ctx, pos, size, creature.vel); break;
    case 'infernal_leviathan': drawInfernalLeviathan(ctx, pos, size, creature); break;
  }

  if (health < maxHealth && !isBoss) {
    ctx.globalAlpha = 1 - health / maxHealth;
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (cState === 'chase' || cState === 'charge') {
    ctx.fillStyle = cState === 'charge' ? '#ff0000' : '#ff4500';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - size - 5, cState === 'charge' ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (cState === 'ambush') {
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - size - 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// === VOLCANIC CREATURE SPRITES ===
function drawLavaEel(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, vel: Vec2) {
  const angle = Math.atan2(vel.y, vel.x);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);

  // Body segments with magma glow
  ctx.lineWidth = size * 0.4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#cc3300';
  ctx.beginPath();
  ctx.moveTo(size, 0);
  for (let i = 1; i <= 8; i++) {
    const wave = Math.sin(Date.now() / 150 + i * 1.2) * 10;
    ctx.lineTo(size - i * size * 0.3, wave);
  }
  ctx.stroke();

  // Magma veins along body
  ctx.strokeStyle = '#ff880060';
  ctx.lineWidth = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(size * 0.8, 0);
  for (let i = 1; i <= 6; i++) {
    const wave = Math.sin(Date.now() / 150 + i * 1.2) * 8;
    ctx.lineTo(size - i * size * 0.35, wave);
  }
  ctx.stroke();

  // Head
  ctx.fillStyle = '#cc3300';
  ctx.beginPath();
  ctx.arc(size, 0, size * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Glowing eyes
  ctx.fillStyle = '#ff6600';
  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(size * 1.1, -size * 0.15, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 1.1, size * 0.15, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawVentCrab(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, vel: Vec2) {
  const t = Date.now() * 0.005;

  // Shell
  ctx.fillStyle = '#8b4513';
  ctx.strokeStyle = '#ff4500';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, size, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Armor plates on shell
  ctx.strokeStyle = '#6b3510';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size * 0.6, 0, Math.PI * 2);
  ctx.stroke();

  // Legs
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 2;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const legAngle = (i - 1) * 0.4 + Math.sin(t + i * 2 + side) * 0.2;
      ctx.beginPath();
      ctx.moveTo(pos.x + side * size * 0.7, pos.y + (i - 1) * size * 0.25);
      const kx = pos.x + side * (size + 8) + Math.cos(legAngle) * 6;
      const ky = pos.y + (i - 1) * size * 0.25 + size * 0.3;
      ctx.lineTo(kx, ky);
      ctx.lineTo(kx + side * 4, ky + 4);
      ctx.stroke();
    }
  }

  // Claws
  ctx.fillStyle = '#a0522d';
  for (let side = -1; side <= 1; side += 2) {
    const clawX = pos.x + side * (size + 5);
    const clawY = pos.y - size * 0.2 + Math.sin(t * 2 + side) * 3;
    ctx.beginPath();
    ctx.moveTo(clawX, clawY);
    ctx.lineTo(clawX + side * 8, clawY - 4);
    ctx.lineTo(clawX + side * 6, clawY + 4);
    ctx.closePath();
    ctx.fill();
  }

  // Eyes
  ctx.fillStyle = '#ff4500';
  ctx.shadowColor = '#ff4500';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(pos.x - size * 0.3, pos.y - size * 0.4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pos.x + size * 0.3, pos.y - size * 0.4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawMagmaRay(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, vel: Vec2) {
  const angle = Math.atan2(vel.y, vel.x);
  const t = Date.now() * 0.003;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);

  // Wing membranes
  const wingFlap = Math.sin(t + pos.x * 0.01) * 0.2;
  ctx.fillStyle = '#8b0000';
  ctx.strokeStyle = '#ff3300';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.quadraticCurveTo(0, -size * (0.8 + wingFlap), -size * 0.5, -size * (0.4 + wingFlap * 0.5));
  ctx.quadraticCurveTo(-size * 0.3, 0, -size * 0.5, size * (0.4 + wingFlap * 0.5));
  ctx.quadraticCurveTo(0, size * (0.8 + wingFlap), size * 0.5, 0);
  ctx.fill();
  ctx.stroke();

  // Body center line
  ctx.fillStyle = '#660000';
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Magma veins on wings
  ctx.strokeStyle = '#ff440040';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-size * 0.2, -size * (0.3 + i * 0.1), -size * 0.4, -size * (0.2 + i * 0.08));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-size * 0.2, size * (0.3 + i * 0.1), -size * 0.4, size * (0.2 + i * 0.08));
    ctx.stroke();
  }

  // Tail
  ctx.strokeStyle = '#8b0000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-size * 0.4, 0);
  ctx.quadraticCurveTo(-size * 0.8, Math.sin(t * 2) * 10, -size * 1.2, Math.sin(t * 2.5) * 15);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#ff3300';
  ctx.shadowColor = '#ff3300';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(size * 0.3, -size * 0.08, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.3, size * 0.08, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Heat shimmer aura
  ctx.globalAlpha = 0.15;
  const heatGrad = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, size);
  heatGrad.addColorStop(0, '#ff4400');
  heatGrad.addColorStop(1, '#ff440000');
  ctx.fillStyle = heatGrad;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawInfernalLeviathan(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, creature: Creature) {
  const t = Date.now() * 0.002;

  // Massive serpentine body
  ctx.lineWidth = size * 0.25;
  ctx.lineCap = 'round';

  // Body segments with obsidian texture
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? '#1a0a00' : '#ff440020';
    ctx.lineWidth = pass === 0 ? size * 0.25 : size * 0.12;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    for (let i = 1; i <= 12; i++) {
      const wave = Math.sin(t + i * 0.8) * 20 * (1 + i * 0.1);
      ctx.lineTo(pos.x - i * size * 0.2, pos.y + wave);
    }
    ctx.stroke();
  }

  // Magma vein cracks along body
  ctx.strokeStyle = '#ff660080';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const segX = pos.x - i * size * 0.25;
    const segY = pos.y + Math.sin(t + i * 0.8) * 18;
    ctx.beginPath();
    ctx.moveTo(segX, segY - size * 0.08);
    ctx.lineTo(segX + Math.sin(i * 2.3) * 8, segY + size * 0.08);
    ctx.stroke();
  }

  // Steam vents along spine
  if (Math.sin(t * 3) > 0.5) {
    ctx.strokeStyle = '#ffffff20';
    ctx.lineWidth = 1;
    for (let i = 2; i < 10; i += 3) {
      const segX = pos.x - i * size * 0.2;
      const segY = pos.y + Math.sin(t + i * 0.8) * 18;
      ctx.beginPath();
      ctx.moveTo(segX, segY - size * 0.12);
      ctx.lineTo(segX + Math.sin(t * 5 + i) * 5, segY - size * 0.3);
      ctx.stroke();
    }
  }

  // Head
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Obsidian horn/crest
  ctx.fillStyle = '#2a1500';
  ctx.beginPath();
  ctx.moveTo(pos.x + size * 0.2, pos.y - size * 0.15);
  ctx.lineTo(pos.x + size * 0.35, pos.y - size * 0.35);
  ctx.lineTo(pos.x + size * 0.15, pos.y - size * 0.1);
  ctx.fill();

  // Magma eyes
  ctx.fillStyle = '#ff4400';
  ctx.shadowColor = '#ff4400';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(pos.x + size * 0.15, pos.y - size * 0.06, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pos.x + size * 0.15, pos.y + size * 0.06, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Jaw with magma drip
  ctx.strokeStyle = '#ff220060';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pos.x + size * 0.25, pos.y + size * 0.1);
  ctx.lineTo(pos.x + size * 0.4, pos.y + size * 0.15);
  ctx.stroke();
  if (Math.sin(t * 4) > 0.7) {
    ctx.fillStyle = '#ff440080';
    ctx.beginPath();
    ctx.arc(pos.x + size * 0.35, pos.y + size * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  for (const p of projectiles) {
    const angle = Math.atan2(p.vel.y, p.vel.x);
    switch (p.type) {
      case 'harpoon': {
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        const len = 12;
        ctx.beginPath();
        ctx.moveTo(p.pos.x - Math.cos(angle) * len, p.pos.y - Math.sin(angle) * len);
        ctx.lineTo(p.pos.x, p.pos.y);
        ctx.stroke();
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'torpedo': {
        ctx.fillStyle = '#ff6600';
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#ff880040';
        ctx.beginPath();
        ctx.arc(p.pos.x - Math.cos(angle) * 12, p.pos.y - Math.sin(angle) * 12, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'plasma': {
        ctx.fillStyle = '#e0b0ff';
        ctx.shadowColor = '#e0b0ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
      case 'flak': {
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'cryo': {
        ctx.fillStyle = '#88ddff';
        ctx.shadowColor = '#88ddff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#88ddff30';
        ctx.beginPath();
        ctx.arc(p.pos.x - Math.cos(angle) * 8, p.pos.y - Math.sin(angle) * 8, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'railgun': {
        ctx.strokeStyle = '#ff3333';
        ctx.shadowColor = '#ff3333';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.pos.x - Math.cos(angle) * 30, p.pos.y - Math.sin(angle) * 30);
        ctx.lineTo(p.pos.x, p.pos.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
      case 'vortex': {
        const vortexRadius = 15 + Math.sin(Date.now() * 0.01) * 5;
        const grad = ctx.createRadialGradient(p.pos.x, p.pos.y, 0, p.pos.x, p.pos.y, vortexRadius);
        grad.addColorStop(0, '#1a0a3e');
        grad.addColorStop(0.5, '#7b2fff60');
        grad.addColorStop(1, '#7b2fff00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, vortexRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e0b0ff60';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const a = Date.now() * 0.005 + i * 2.1;
          ctx.beginPath();
          ctx.arc(p.pos.x + Math.cos(a) * 8, p.pos.y + Math.sin(a) * 8, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
    }
  }
}

function drawMinimap(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number, otherPlayers?: Record<string, PlayerData>) {
  const mapW = 140;
  const mapH = 200;
  const mapX = canvasW - mapW - 15;
  const mapY = 50;
  const isVolcanic = state.currentMap === 'volcanic';

  const viewRange = Math.max(state.generatedDepth, 2000);

  ctx.fillStyle = isVolcanic ? 'rgba(26, 8, 0, 0.85)' : 'rgba(16, 20, 24, 0.85)';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = isVolcanic ? '#4a2000' : '#1a2a3a';
  ctx.lineWidth = 1;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  if (isVolcanic) {
    // Volcanic gradient
    const volcGrad = ctx.createLinearGradient(mapX, mapY, mapX, mapY + mapH);
    volcGrad.addColorStop(0, '#1a080020');
    volcGrad.addColorStop(1, '#ff220020');
    ctx.fillStyle = volcGrad;
    ctx.fillRect(mapX, mapY, mapW, mapH);
  } else {
    for (const z of DEPTH_ZONES) {
      if (z.zone === 'volcanic') continue;
      const y1 = mapY + (Math.max(0, z.minDepth) / viewRange) * mapH;
      const y2 = mapY + (Math.min(z.maxDepth, viewRange) / viewRange) * mapH;
      if (y1 < mapY + mapH) {
        ctx.fillStyle = z.waterColor + '80';
        ctx.fillRect(mapX, Math.max(mapY, y1), mapW, Math.min(y2 - y1, mapY + mapH - y1));
      }
    }
  }

  const centerX = mapX + mapW / 2;
  const localRangeX = 2400;
  const toMapX = (worldX: number) => {
    const relative = (worldX - state.sub.pos.x + localRangeX) / (localRangeX * 2);
    return mapX + relative * mapW;
  };

  for (const c of state.creatures) {
    const cx = toMapX(c.pos.x);
    const cy = mapY + (c.pos.y / viewRange) * mapH;
    if (cx > mapX && cx < mapX + mapW && cy > mapY && cy < mapY + mapH) {
      ctx.fillStyle = c.isBoss ? '#ff4500' : c.glowColor;
      ctx.beginPath();
      ctx.arc(cx, cy, c.isBoss ? 3 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (otherPlayers) {
    for (const [, player] of Object.entries(otherPlayers)) {
      if (player.alive) {
        const px = toMapX(player.odometry.x);
        const py = mapY + (player.depth / viewRange) * mapH;
        if (px > mapX && px < mapX + mapW && py > mapY && py < mapY + mapH) {
          ctx.fillStyle = '#00ff88';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  const subX = centerX;
  const subY = mapY + (state.sub.pos.y / viewRange) * mapH;
  ctx.fillStyle = '#00bfff';
  ctx.beginPath();
  ctx.arc(subX, subY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00bfff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(subX, subY, 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#6a7a84';
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.fillText(isVolcanic ? '🌋 VOLCANIC' : 'MAP', mapX + 4, mapY + 12);
  ctx.fillText(`${Math.floor(state.sub.depth)}m`, mapX + 4, mapY + mapH - 4);
}

// --- Original creature draw functions ---
function drawFish(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, vel: Vec2) {
  const angle = Math.atan2(vel.y, vel.x);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);

  // Body with gradient
  const bodyGrad = ctx.createLinearGradient(-size, 0, size, 0);
  bodyGrad.addColorStop(0, '#4a8aaa');
  bodyGrad.addColorStop(0.5, '#6ba3be');
  bodyGrad.addColorStop(1, '#8ecae6');
  ctx.fillStyle = bodyGrad;

  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.quadraticCurveTo(size * 0.3, -size * 0.5, -size, 0);
  ctx.quadraticCurveTo(size * 0.3, size * 0.5, size, 0);
  ctx.fill();
  ctx.stroke();

  // Tail with animation
  const tailWave = Math.sin(Date.now() * 0.01 + pos.x) * 0.3;
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(-size - size * 0.6, -size * 0.4 + tailWave * size);
  ctx.lineTo(-size - size * 0.6, size * 0.4 + tailWave * size);
  ctx.closePath();
  ctx.fill();

  // Dorsal fin
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.2);
  ctx.quadraticCurveTo(size * 0.2, -size * 0.6, -size * 0.2, -size * 0.15);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size * 0.5, -size * 0.1, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(size * 0.55, -size * 0.1, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // Scales shimmer
  ctx.strokeStyle = '#8ecae620';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-size * 0.2 + i * size * 0.25, 0, size * 0.15, 0, Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function drawJellyfish(ctx: CanvasRenderingContext2D, pos: Vec2, size: number) {
  const t = Date.now() * 0.003;
  const pulse = 1 + Math.sin(t) * 0.1;

  // Bell with gradient
  const bellGrad = ctx.createRadialGradient(pos.x, pos.y - size * 0.2, 0, pos.x, pos.y, size * pulse);
  bellGrad.addColorStop(0, '#f0d0ff80');
  bellGrad.addColorStop(0.5, '#e0b0ff60');
  bellGrad.addColorStop(1, '#e0b0ff20');
  ctx.fillStyle = bellGrad;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size * pulse, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#f0d0ff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner structure
  ctx.strokeStyle = '#e0b0ff40';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y - size * 0.1, size * 0.4, Math.PI, 0);
  ctx.stroke();

  // Tentacles
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const x = pos.x - size * 0.8 + (i * size * 1.6) / 6;
    const tentAlpha = 0.3 + Math.sin(t + i * 0.5) * 0.15;
    ctx.strokeStyle = `rgba(224, 176, 255, ${tentAlpha})`;
    ctx.beginPath();
    ctx.moveTo(x, pos.y);
    const wave1 = Math.sin(t + i * 0.7) * 6;
    const wave2 = Math.sin(t * 1.3 + i * 0.5) * 4;
    ctx.quadraticCurveTo(x + wave1, pos.y + size * 0.6, x + wave2, pos.y + size * 1.5);
    ctx.stroke();
  }

  // Bioluminescent dots
  ctx.fillStyle = '#f0d0ff';
  for (let i = 0; i < 4; i++) {
    const dotAlpha = 0.3 + Math.sin(t * 2 + i * 1.5) * 0.3;
    ctx.globalAlpha = dotAlpha;
    const dx = pos.x + Math.cos(i * 1.5) * size * 0.3;
    const dy = pos.y - size * 0.3 + Math.sin(i * 2) * size * 0.15;
    ctx.beginPath();
    ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawAngler(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, vel: Vec2) {
  const angle = Math.atan2(vel.y, vel.x);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Teeth
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff80';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const tx = size * 0.5 + i * 3;
    ctx.beginPath();
    ctx.moveTo(tx, size * 0.2);
    ctx.lineTo(tx + 1.5, size * 0.35);
    ctx.lineTo(tx + 3, size * 0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx, -size * 0.2);
    ctx.lineTo(tx + 1.5, -size * 0.35);
    ctx.lineTo(tx + 3, -size * 0.2);
    ctx.fill();
  }

  // Jaw
  ctx.strokeStyle = '#ff6b35';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.3);
  ctx.lineTo(size * 1.1, size * 0.1);
  ctx.lineTo(size * 0.5, -size * 0.1);
  ctx.stroke();

  // Lure
  ctx.fillStyle = '#ffaa00';
  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(size * 0.3, -size * 0.9, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Lure stalk
  ctx.strokeStyle = '#ffaa0080';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.quadraticCurveTo(size * 0.1, -size * 0.8, size * 0.3, -size * 0.9);
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.arc(size * 0.4, -size * 0.15, 3, 0, Math.PI * 2);
  ctx.fill();

  // Fin
  ctx.strokeStyle = '#ff6b3540';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, -size * 0.5);
  ctx.quadraticCurveTo(-size * 0.5, -size * 0.8, -size * 0.7, -size * 0.4);
  ctx.stroke();

  ctx.restore();
}

function drawEel(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, vel: Vec2) {
  const angle = Math.atan2(vel.y, vel.x);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.lineWidth = size * 0.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size, 0);
  for (let i = 1; i <= 6; i++) {
    const wave = Math.sin(Date.now() / 200 + i * 1.5) * 8;
    ctx.lineTo(size - i * size * 0.35, wave);
  }
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.beginPath();
  ctx.arc(size, 0, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6bb5ff';
  ctx.beginPath();
  ctx.arc(size * 1.1, -size * 0.15, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSquid(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, vel: Vec2) {
  const angle = Math.atan2(vel.y, vel.x);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const tAngle = (i / 6) * Math.PI - Math.PI / 2;
    const wave = Math.sin(Date.now() / 300 + i) * 8;
    ctx.beginPath();
    ctx.moveTo(-size * 0.7, Math.sin(tAngle) * size * 0.3);
    ctx.quadraticCurveTo(-size * 1.2, Math.sin(tAngle) * size * 0.4 + wave, -size * 1.6, Math.sin(tAngle) * size * 0.3);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff4081';
  ctx.beginPath();
  ctx.arc(size * 0.3, -size * 0.1, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSerpent(ctx: CanvasRenderingContext2D, pos: Vec2, size: number) {
  ctx.lineWidth = size * 0.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  for (let i = 1; i <= 8; i++) {
    const wave = Math.sin(Date.now() / 400 + i) * 15;
    ctx.lineTo(pos.x - i * size * 0.3, pos.y + wave);
  }
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.arc(pos.x + size * 0.15, pos.y - size * 0.1, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawLeviathan(ctx: CanvasRenderingContext2D, pos: Vec2, size: number) {
  const gradient = ctx.createRadialGradient(pos.x, pos.y, size * 0.3, pos.x, pos.y, size);
  gradient.addColorStop(0, '#2d1b4e');
  gradient.addColorStop(1, '#2d1b4e00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, size, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7b2fff';
  ctx.shadowColor = '#7b2fff';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(pos.x + size * 0.3, pos.y - size * 0.1, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pos.x + size * 0.3, pos.y + size * 0.1, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#2d1b4e88';
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + Math.PI * 0.5;
    const wave = Math.sin(Date.now() / 600 + i) * 20;
    ctx.beginPath();
    ctx.moveTo(pos.x + Math.cos(a) * size * 0.5, pos.y + Math.sin(a) * size * 0.3);
    ctx.quadraticCurveTo(
      pos.x + Math.cos(a) * size + wave, pos.y + Math.sin(a) * size * 0.6,
      pos.x + Math.cos(a) * size * 1.3, pos.y + Math.sin(a) * size * 0.8 + wave
    );
    ctx.stroke();
  }
}

function drawPhantom(ctx: CanvasRenderingContext2D, pos: Vec2, size: number) {
  const flickerAlpha = 0.4 + Math.sin(Date.now() / 300) * 0.2;
  ctx.globalAlpha = flickerAlpha;
  const gradient = ctx.createRadialGradient(pos.x, pos.y, size * 0.2, pos.x, pos.y, size);
  gradient.addColorStop(0, '#e0b0ff');
  gradient.addColorStop(0.5, '#1a0a2e');
  gradient.addColorStop(1, '#1a0a2e00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, size, size * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0b0ff';
  ctx.shadowColor = '#e0b0ff';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(pos.x + size * 0.2, pos.y - size * 0.1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pos.x + size * 0.2, pos.y + size * 0.1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#e0b0ff60';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const wave = Math.sin(Date.now() / 500 + i * 1.2) * 15;
    ctx.beginPath();
    ctx.moveTo(pos.x + Math.cos(a) * size * 0.5, pos.y + Math.sin(a) * size * 0.4);
    ctx.quadraticCurveTo(
      pos.x + Math.cos(a) * size * 1.2 + wave, pos.y + Math.sin(a) * size * 0.8,
      pos.x + Math.cos(a) * size * 1.5, pos.y + Math.sin(a) * size + wave
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSonarPing(ctx: CanvasRenderingContext2D, ping: SonarPing) {
  ctx.strokeStyle = `rgba(180, 197, 207, ${ping.alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ping.origin.x, ping.origin.y, ping.radius, 0, Math.PI * 2);
  ctx.stroke();
  if (ping.echoReturned && ping.echoRadius > 0) {
    ctx.strokeStyle = `rgba(255, 69, 0, ${ping.alpha * 0.7})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(ping.origin.x, ping.origin.y, ping.echoRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.globalAlpha = p.alpha * (p.life / p.maxLife);
    if (p.type === 'coin') {
      ctx.fillStyle = '#ffd700';
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillText('◆', p.pos.x - 3, p.pos.y + 3);
    } else if (p.type === 'electric') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.pos.x, p.pos.y);
      ctx.lineTo(p.pos.x + (Math.random() - 0.5) * 10, p.pos.y + (Math.random() - 0.5) * 10);
      ctx.stroke();
    } else if (p.type === 'explosion' || p.type === 'magma') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'steam') {
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'ash') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawDarknessOverlay(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  ambientLight: number,
  visibility: number,
  lightOn: boolean
) {
  const darkness = 1 - ambientLight;
  if (darkness <= 0) return;

  const baseRadius = lightOn ? LIGHT_RADIUS_BASE * visibility * 1.6 : LIGHT_RADIUS_BASE * visibility * 0.5;
  const lightRadius = Math.max(baseRadius, 180);
  const maxDarkness = Math.min(darkness * 0.65, 0.7);

  const gradient = ctx.createRadialGradient(cw / 2, ch / 2, lightRadius * 0.4, cw / 2, ch / 2, lightRadius);
  gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
  gradient.addColorStop(0.7, `rgba(0, 0, 0, ${maxDarkness * 0.3})`);
  gradient.addColorStop(1, `rgba(0, 0, 0, ${maxDarkness})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cw, ch);
}
