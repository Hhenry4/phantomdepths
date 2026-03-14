import { GameState, Creature, SonarPing, Vec2, Particle, Projectile, TerrainFeature } from '../types';
import { SUB_WIDTH, SUB_HEIGHT, LIGHT_RADIUS_BASE, DEPTH_ZONES } from '../constants';
import { getZoneConfig } from './Terrain';
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
  const zoneConfig = getZoneConfig(sub.depth);

  // Ocean gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
  bgGrad.addColorStop(0, zoneConfig.waterColor);
  bgGrad.addColorStop(1, darkenColor(zoneConfig.waterColor, 0.3));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Underwater current lines
  drawCurrents(ctx, state, canvasW, canvasH);

  ctx.save();
  ctx.translate(canvasW / 2 - camera.x, canvasH / 2 - camera.y);

  drawTerrain(ctx, state, camera, canvasW, canvasH);
  drawTerrainFeatures(ctx, state.terrain.features, camera, canvasH);
  drawParticles(ctx, state.particles);
  state.creatures.forEach(c => drawCreature(ctx, c, sub.depth));
  drawProjectiles(ctx, state.projectiles);
  state.sonarPings.forEach(p => drawSonarPing(ctx, p));

  // Other players
  if (otherPlayers) {
    for (const [id, player] of Object.entries(otherPlayers)) {
      if (player.alive) {
        drawOtherPlayer(ctx, player);
      }
    }
  }

  // Aim line
  drawAimLine(ctx, sub.pos, sub.aimAngle);

  drawSubmarine(ctx, sub.pos, sub.rotation, sub.lightOn, sub.hull, sub.maxHull, sub.aimAngle);

  ctx.restore();

  const effectiveLightLevel = lightLevel ?? 0;
  const lightRadiusMult = 1 + effectiveLightLevel * 0.3;
  drawDarknessOverlay(ctx, canvasW, canvasH, zoneConfig.ambientLight, zoneConfig.visibility * lightRadiusMult, sub.lightOn);
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

function drawAimLine(ctx: CanvasRenderingContext2D, pos: Vec2, aimAngle: number) {
  ctx.strokeStyle = 'rgba(0, 191, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(pos.x + Math.cos(aimAngle) * 40, pos.y + Math.sin(aimAngle) * 40);
  ctx.lineTo(pos.x + Math.cos(aimAngle) * 120, pos.y + Math.sin(aimAngle) * 120);
  ctx.stroke();
  ctx.setLineDash([]);
  // Crosshair dot
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

function drawTerrain(ctx: CanvasRenderingContext2D, state: GameState, camera: Vec2, cw: number, ch: number) {
  const { left, right } = state.terrain;
  const viewTop = camera.y - ch / 2 - 100;
  const viewBottom = camera.y + ch / 2 + 100;

  // Rock texture gradient
  const rockGrad = ctx.createLinearGradient(0, viewTop, 0, viewBottom);
  rockGrad.addColorStop(0, '#0d1218');
  rockGrad.addColorStop(0.5, '#0a0e14');
  rockGrad.addColorStop(1, '#060a0f');

  ctx.fillStyle = rockGrad;
  ctx.beginPath();
  ctx.moveTo(-3000, viewTop);
  for (const p of left) {
    if (p.y >= viewTop - 200 && p.y <= viewBottom + 200) ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(-3000, viewBottom);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(3000, viewTop);
  for (const p of right) {
    if (p.y >= viewTop - 200 && p.y <= viewBottom + 200) ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(3000, viewBottom);
  ctx.closePath();
  ctx.fill();

  // Rock edge highlights
  ctx.strokeStyle = '#1e2d3d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < left.length; i++) {
    const p = left[i];
    if (p.y >= viewTop - 200 && p.y <= viewBottom + 200) {
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < right.length; i++) {
    const p = right[i];
    if (p.y >= viewTop - 200 && p.y <= viewBottom + 200) {
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();

  // Rock detail lines
  ctx.strokeStyle = '#15202d';
  ctx.lineWidth = 1;
  for (let i = 0; i < left.length - 1; i += 3) {
    const p = left[i];
    if (p.y >= viewTop && p.y <= viewBottom) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 15 - Math.sin(p.y * 0.1) * 10, p.y + 10);
      ctx.stroke();
    }
  }
  for (let i = 0; i < right.length - 1; i += 3) {
    const p = right[i];
    if (p.y >= viewTop && p.y <= viewBottom) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 15 + Math.sin(p.y * 0.1) * 10, p.y + 10);
      ctx.stroke();
    }
  }
}

function drawTerrainFeatures(ctx: CanvasRenderingContext2D, features: TerrainFeature[], camera: Vec2, ch: number) {
  const viewTop = camera.y - ch / 2 - 100;
  const viewBottom = camera.y + ch / 2 + 100;

  for (const f of features) {
    if (f.pos.y < viewTop - 50 || f.pos.y > viewBottom + 50) continue;

    ctx.globalAlpha = 0.8;
    switch (f.type) {
      case 'kelp':
        drawKelp(ctx, f);
        break;
      case 'cave':
        drawCaveEntrance(ctx, f);
        break;
      case 'wreck':
        drawWreck(ctx, f);
        break;
      case 'ruin':
        drawRuin(ctx, f);
        break;
      case 'chest':
        if (!f.collected) drawChest(ctx, f);
        break;
    }
    ctx.globalAlpha = 1;
  }
}

function drawKelp(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  ctx.strokeStyle = f.color;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const ox = (i - 1.5) * 6;
    ctx.beginPath();
    ctx.moveTo(f.pos.x + ox, f.pos.y);
    const t = Date.now() * 0.002;
    for (let j = 1; j <= 5; j++) {
      const wave = Math.sin(t + j * 0.8 + i) * 6;
      ctx.lineTo(f.pos.x + ox + wave, f.pos.y - j * f.size * 0.18);
    }
    ctx.stroke();
    // Leaf blobs
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.ellipse(f.pos.x + ox + Math.sin(t + i) * 4, f.pos.y - f.size * 0.6, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRockFormation(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  ctx.fillStyle = f.color;
  // Multiple rocks of varying sizes
  const rocks = [
    { ox: 0, oy: 0, rx: f.size * 0.5, ry: f.size * 0.4 },
    { ox: f.size * 0.4, oy: -f.size * 0.1, rx: f.size * 0.3, ry: f.size * 0.25 },
    { ox: -f.size * 0.35, oy: f.size * 0.05, rx: f.size * 0.35, ry: f.size * 0.3 },
  ];
  for (const r of rocks) {
    ctx.beginPath();
    ctx.ellipse(f.pos.x + r.ox, f.pos.y + r.oy, r.rx, r.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Highlight edge
  ctx.strokeStyle = '#5a6a7a40';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(f.pos.x, f.pos.y, f.size * 0.5, f.size * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
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
  // Stalactites
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const sx = f.pos.x + (i - 1) * f.size * 0.3;
    ctx.beginPath();
    ctx.moveTo(sx, f.pos.y - f.size * 0.5);
    ctx.lineTo(sx + 3, f.pos.y - f.size * 0.2);
    ctx.stroke();
  }
}

function drawWreck(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  ctx.strokeStyle = f.color;
  ctx.lineWidth = 2;
  // Hull outline
  ctx.beginPath();
  ctx.moveTo(f.pos.x - f.size, f.pos.y + f.size * 0.3);
  ctx.lineTo(f.pos.x - f.size * 0.8, f.pos.y - f.size * 0.2);
  ctx.lineTo(f.pos.x + f.size * 0.5, f.pos.y - f.size * 0.3);
  ctx.lineTo(f.pos.x + f.size, f.pos.y + f.size * 0.1);
  ctx.stroke();
  // Broken mast
  ctx.beginPath();
  ctx.moveTo(f.pos.x, f.pos.y - f.size * 0.2);
  ctx.lineTo(f.pos.x + f.size * 0.1, f.pos.y - f.size * 0.8);
  ctx.stroke();
  // Portholes
  ctx.fillStyle = '#0a1520';
  ctx.beginPath();
  ctx.arc(f.pos.x - f.size * 0.3, f.pos.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(f.pos.x + f.size * 0.1, f.pos.y - f.size * 0.1, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawRuin(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  ctx.strokeStyle = f.color;
  ctx.lineWidth = 2;
  // Column
  ctx.strokeRect(f.pos.x - 4, f.pos.y - f.size * 0.8, 8, f.size * 0.8);
  // Broken column
  ctx.strokeRect(f.pos.x + f.size * 0.4, f.pos.y - f.size * 0.4, 6, f.size * 0.4);
  // Arch top
  ctx.beginPath();
  ctx.arc(f.pos.x + f.size * 0.2, f.pos.y - f.size * 0.8, f.size * 0.25, Math.PI, 0);
  ctx.stroke();
  // Mystery glow
  ctx.fillStyle = '#e0b0ff10';
  ctx.beginPath();
  ctx.arc(f.pos.x + f.size * 0.2, f.pos.y - f.size * 0.5, f.size * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawChest(ctx: CanvasRenderingContext2D, f: TerrainFeature) {
  const bob = Math.sin(Date.now() * 0.003 + f.pos.x) * 3;
  const cx = f.pos.x;
  const cy = f.pos.y + bob;

  // Glow
  ctx.fillStyle = '#ffd70020';
  ctx.beginPath();
  ctx.arc(cx, cy, f.size * 2, 0, Math.PI * 2);
  ctx.fill();

  // Chest body
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(cx - f.size * 0.6, cy - f.size * 0.3, f.size * 1.2, f.size * 0.6);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - f.size * 0.6, cy - f.size * 0.3, f.size * 1.2, f.size * 0.6);
  // Lid
  ctx.beginPath();
  ctx.arc(cx, cy - f.size * 0.3, f.size * 0.6, Math.PI, 0);
  ctx.fillStyle = '#a07818';
  ctx.fill();
  ctx.stroke();
  // Lock
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  // Sparkle
  ctx.fillStyle = '#ffd700';
  const sparkle = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
  ctx.globalAlpha = sparkle * 0.6;
  ctx.beginPath();
  ctx.arc(cx + f.size * 0.4, cy - f.size * 0.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;
}

function drawSubmarine(ctx: CanvasRenderingContext2D, pos: Vec2, rotation: number, lightOn: boolean, hull: number, maxHull: number, aimAngle: number) {
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);

  // Light cone
  if (lightOn) {
    const gradient = ctx.createRadialGradient(SUB_WIDTH / 2, 0, 5, SUB_WIDTH / 2 + 150, 0, 200);
    gradient.addColorStop(0, 'rgba(180, 220, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(180, 220, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(SUB_WIDTH / 2, -5);
    ctx.lineTo(SUB_WIDTH / 2 + 250, -80);
    ctx.lineTo(SUB_WIDTH / 2 + 250, 80);
    ctx.lineTo(SUB_WIDTH / 2, 5);
    ctx.closePath();
    ctx.fill();
  }

  const hullRatio = hull / maxHull;
  const hullColor = hullRatio > 0.6 ? '#b4c5cf' : hullRatio > 0.3 ? '#ff8c00' : '#ff4500';

  // Main hull - improved design
  ctx.fillStyle = '#1a2a3a';
  ctx.strokeStyle = hullColor;
  ctx.lineWidth = 2;

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, SUB_WIDTH / 2, SUB_HEIGHT / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Conning tower (sail)
  ctx.fillStyle = '#1e3040';
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

  // Propeller housing
  ctx.fillStyle = '#0f1a24';
  ctx.beginPath();
  ctx.ellipse(-SUB_WIDTH / 2 - 4, 0, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose window
  ctx.fillStyle = lightOn ? '#00bfff' : '#1a4a6e';
  ctx.beginPath();
  ctx.arc(SUB_WIDTH / 4, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  // Hull detail lines
  ctx.strokeStyle = hullColor + '40';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-SUB_WIDTH * 0.15, -SUB_HEIGHT / 2);
  ctx.lineTo(-SUB_WIDTH * 0.15, SUB_HEIGHT / 2);
  ctx.moveTo(SUB_WIDTH * 0.05, -SUB_HEIGHT / 2);
  ctx.lineTo(SUB_WIDTH * 0.05, SUB_HEIGHT / 2);
  ctx.stroke();

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

  // Draw turret / weapon indicator at aim angle
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(aimAngle);
  ctx.strokeStyle = '#00bfff80';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(35, 0);
  ctx.stroke();
  // Small turret circle
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
    ctx.fillStyle = '#ff4500';
    ctx.fillRect(pos.x - barW / 2, barY, barW * (health / maxHealth), barH);
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x - barW / 2, barY, barW, barH);

    ctx.fillStyle = '#ff4500';
    ctx.font = 'bold 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`BOSS: ${type.toUpperCase()}`, pos.x, barY - 5);
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
      case 'shock': {
        ctx.strokeStyle = '#6bb5ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 5, 0, Math.PI * 2);
        ctx.stroke();
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
        // Ice trail
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
        const trailLen = 30;
        ctx.beginPath();
        ctx.moveTo(p.pos.x - Math.cos(angle) * trailLen, p.pos.y - Math.sin(angle) * trailLen);
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
        // Swirl lines
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

  // Dynamic minimap range based on generated depth
  const viewRange = Math.max(state.generatedDepth, 2000);

  ctx.fillStyle = 'rgba(16, 20, 24, 0.85)';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth = 1;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  // Zone colors
  for (const z of DEPTH_ZONES) {
    const y1 = mapY + (Math.max(0, z.minDepth) / viewRange) * mapH;
    const y2 = mapY + (Math.min(z.maxDepth, viewRange) / viewRange) * mapH;
    if (y1 < mapY + mapH) {
      ctx.fillStyle = z.waterColor + '80';
      ctx.fillRect(mapX, Math.max(mapY, y1), mapW, Math.min(y2 - y1, mapY + mapH - y1));
    }
  }

  const centerX = mapX + mapW / 2;
  const localRangeX = 2400;
  const toMapX = (worldX: number) => {
    const relative = (worldX - state.sub.pos.x + localRangeX) / (localRangeX * 2);
    return mapX + relative * mapW;
  };

  // Terrain (local horizontal window around current submarine position)
  ctx.strokeStyle = '#2a3a4a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < state.terrain.left.length; i += 10) {
    const p = state.terrain.left[i];
    const mx = toMapX(p.x);
    const my = mapY + (p.y / viewRange) * mapH;
    if (mx > mapX && mx < mapX + mapW && my > mapY && my < mapY + mapH) {
      if (i === 0) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
    }
  }
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < state.terrain.right.length; i += 10) {
    const p = state.terrain.right[i];
    const mx = toMapX(p.x);
    const my = mapY + (p.y / viewRange) * mapH;
    if (mx > mapX && mx < mapX + mapW && my > mapY && my < mapY + mapH) {
      if (i === 0) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
    }
  }
  ctx.stroke();

  // Creatures
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

  // Other players on minimap
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

  // Sub position
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
  ctx.fillText('MAP', mapX + 4, mapY + 12);
  ctx.fillText(`${Math.floor(state.sub.depth)}m`, mapX + 4, mapY + mapH - 4);
}

// --- Creature draw functions ---
function drawFish(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, vel: Vec2) {
  const angle = Math.atan2(vel.y, vel.x);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.quadraticCurveTo(0, -size / 2, -size, 0);
  ctx.quadraticCurveTo(0, size / 2, size, 0);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(-size - size / 2, -size / 3);
  ctx.lineTo(-size - size / 2, size / 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawJellyfish(ctx: CanvasRenderingContext2D, pos: Vec2, size: number) {
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const x = pos.x - size + (i * size * 2) / 4;
    ctx.beginPath();
    ctx.moveTo(x, pos.y);
    const wave = Math.sin(Date.now() / 500 + i) * 5;
    ctx.quadraticCurveTo(x + wave, pos.y + size, x - wave, pos.y + size * 1.5);
    ctx.stroke();
  }
}

function drawAngler(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, vel: Vec2) {
  const angle = Math.atan2(vel.y, vel.x);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.3);
  ctx.lineTo(size * 1.1, size * 0.1);
  ctx.lineTo(size * 0.5, -size * 0.1);
  ctx.stroke();
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.arc(size * 0.3, -size * 0.9, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.quadraticCurveTo(size * 0.1, -size * 0.8, size * 0.3, -size * 0.9);
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
    const angle = (i / 4) * Math.PI + Math.PI * 0.5;
    const wave = Math.sin(Date.now() / 600 + i) * 20;
    ctx.beginPath();
    ctx.moveTo(pos.x + Math.cos(angle) * size * 0.5, pos.y + Math.sin(angle) * size * 0.3);
    ctx.quadraticCurveTo(
      pos.x + Math.cos(angle) * size + wave,
      pos.y + Math.sin(angle) * size * 0.6,
      pos.x + Math.cos(angle) * size * 1.3,
      pos.y + Math.sin(angle) * size * 0.8 + wave
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
    const angle = (i / 6) * Math.PI * 2;
    const wave = Math.sin(Date.now() / 500 + i * 1.2) * 15;
    ctx.beginPath();
    ctx.moveTo(pos.x + Math.cos(angle) * size * 0.5, pos.y + Math.sin(angle) * size * 0.4);
    ctx.quadraticCurveTo(
      pos.x + Math.cos(angle) * size * 1.2 + wave,
      pos.y + Math.sin(angle) * size * 0.8,
      pos.x + Math.cos(angle) * size * 1.5,
      pos.y + Math.sin(angle) * size + wave
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
    } else if (p.type === 'explosion') {
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

  const lightRadius = lightOn ? LIGHT_RADIUS_BASE * visibility : LIGHT_RADIUS_BASE * visibility * 0.3;
  const gradient = ctx.createRadialGradient(cw / 2, ch / 2, lightRadius * 0.3, cw / 2, ch / 2, lightRadius);
  gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
  gradient.addColorStop(1, `rgba(0, 0, 0, ${darkness * 0.85})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cw, ch);
}
