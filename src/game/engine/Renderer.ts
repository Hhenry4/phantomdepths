import { GameState, Creature, SonarPing, Vec2, Particle, Projectile, TerrainFeature } from '../types';
import { SUB_WIDTH, SUB_HEIGHT, LIGHT_RADIUS_BASE, DEPTH_ZONES } from '../constants';
import { getZoneConfig } from './Terrain';

export function render(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number) {
  const { sub, camera } = state;
  const zoneConfig = getZoneConfig(sub.depth);

  ctx.fillStyle = zoneConfig.waterColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.save();
  ctx.translate(canvasW / 2 - camera.x, canvasH / 2 - camera.y);

  drawTerrain(ctx, state, camera, canvasW, canvasH);
  drawTerrainFeatures(ctx, state.terrain.features, camera, canvasH);
  drawParticles(ctx, state.particles);
  state.creatures.forEach(c => drawCreature(ctx, c, sub.depth));
  drawProjectiles(ctx, state.projectiles);
  state.sonarPings.forEach(p => drawSonarPing(ctx, p));
  drawSubmarine(ctx, sub.pos, sub.rotation, sub.lightOn, sub.hull, sub.maxHull);

  ctx.restore();

  drawDarknessOverlay(ctx, canvasW, canvasH, zoneConfig.ambientLight, zoneConfig.visibility, sub.lightOn);
  drawMinimap(ctx, state, canvasW, canvasH);
}

function drawTerrain(ctx: CanvasRenderingContext2D, state: GameState, camera: Vec2, cw: number, ch: number) {
  const { left, right } = state.terrain;
  const viewTop = camera.y - ch / 2 - 100;
  const viewBottom = camera.y + ch / 2 + 100;

  ctx.fillStyle = '#0a0e12';
  ctx.beginPath();
  ctx.moveTo(-2000, viewTop);
  for (const p of left) {
    if (p.y >= viewTop - 200 && p.y <= viewBottom + 200) ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(-2000, viewBottom);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(2000, viewTop);
  for (const p of right) {
    if (p.y >= viewTop - 200 && p.y <= viewBottom + 200) ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(2000, viewBottom);
  ctx.closePath();
  ctx.fill();

  // Edge glow
  ctx.strokeStyle = '#1a2a3a';
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
}

function drawTerrainFeatures(ctx: CanvasRenderingContext2D, features: TerrainFeature[], camera: Vec2, ch: number) {
  const viewTop = camera.y - ch / 2 - 100;
  const viewBottom = camera.y + ch / 2 + 100;

  for (const f of features) {
    if (f.pos.y < viewTop - 50 || f.pos.y > viewBottom + 50) continue;

    ctx.globalAlpha = 0.7;
    switch (f.type) {
      case 'coral':
        ctx.fillStyle = f.color;
        for (let i = 0; i < 3; i++) {
          const ox = (i - 1) * f.size * 0.5;
          ctx.beginPath();
          ctx.moveTo(f.pos.x + ox, f.pos.y);
          ctx.lineTo(f.pos.x + ox - 3, f.pos.y - f.size * (0.6 + i * 0.2));
          ctx.lineTo(f.pos.x + ox + 3, f.pos.y - f.size * (0.6 + i * 0.2));
          ctx.closePath();
          ctx.fill();
        }
        break;
      case 'vent':
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.pos.x, f.pos.y, f.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(f.pos.x, f.pos.y - f.size, f.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'wreck':
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(f.pos.x - f.size, f.pos.y);
        ctx.lineTo(f.pos.x + f.size, f.pos.y);
        ctx.moveTo(f.pos.x - f.size * 0.5, f.pos.y - f.size * 0.5);
        ctx.lineTo(f.pos.x + f.size * 0.3, f.pos.y - f.size * 0.8);
        ctx.stroke();
        break;
      case 'crystal':
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(f.pos.x, f.pos.y - f.size);
        ctx.lineTo(f.pos.x + 5, f.pos.y);
        ctx.lineTo(f.pos.x - 5, f.pos.y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      case 'ruin':
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(f.pos.x - f.size * 0.5, f.pos.y - f.size, f.size, f.size);
        ctx.beginPath();
        ctx.arc(f.pos.x, f.pos.y - f.size * 0.5, f.size * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
    ctx.globalAlpha = 1;
  }
}

function drawSubmarine(ctx: CanvasRenderingContext2D, pos: Vec2, rotation: number, lightOn: boolean, hull: number, maxHull: number) {
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
  ctx.fillStyle = '#1a2a3a';
  ctx.strokeStyle = hullColor;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.ellipse(0, 0, SUB_WIDTH / 2, SUB_HEIGHT / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillRect(-8, -SUB_HEIGHT / 2 - 8, 16, 8);
  ctx.strokeRect(-8, -SUB_HEIGHT / 2 - 8, 16, 8);

  ctx.fillStyle = '#0f1a24';
  ctx.fillRect(-SUB_WIDTH / 2 - 8, -4, 10, 8);

  ctx.fillStyle = lightOn ? '#00bfff' : '#1a4a6e';
  ctx.beginPath();
  ctx.arc(SUB_WIDTH / 4, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  // Hull damage cracks
  if (hullRatio < 0.6) {
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1 - hullRatio;
    const crackCount = Math.floor((1 - hullRatio) * 8);
    // Use deterministic crack positions based on hull
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
}

function drawCreature(ctx: CanvasRenderingContext2D, creature: Creature, subDepth: number) {
  const { pos, size, color, glowColor, type, state: cState, health, maxHealth, isBoss } = creature;

  // Boss aura
  if (isBoss) {
    const auraGrad = ctx.createRadialGradient(pos.x, pos.y, size * 0.5, pos.x, pos.y, size * 2.5);
    auraGrad.addColorStop(0, glowColor + '30');
    auraGrad.addColorStop(1, glowColor + '00');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Boss health bar
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
  }

  // Glow
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
    case 'squid': drawSquid(ctx, pos, size, creature.vel); break;
    case 'serpent': drawSerpent(ctx, pos, size); break;
    case 'leviathan': drawLeviathan(ctx, pos, size); break;
  }

  // Damage indicator
  if (health < maxHealth && !isBoss) {
    ctx.globalAlpha = 1 - health / maxHealth;
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (cState === 'chase') {
    ctx.fillStyle = '#ff4500';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - size - 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 2;
  for (const p of projectiles) {
    const angle = Math.atan2(p.vel.y, p.vel.x);
    const len = 12;
    ctx.beginPath();
    ctx.moveTo(p.pos.x - Math.cos(angle) * len, p.pos.y - Math.sin(angle) * len);
    ctx.lineTo(p.pos.x, p.pos.y);
    ctx.stroke();

    // Glow tip
    ctx.fillStyle = '#ffdd44';
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMinimap(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number) {
  const mapW = 120;
  const mapH = 180;
  const mapX = canvasW - mapW - 15;
  const mapY = 50;
  const maxDepth = 8000;

  ctx.fillStyle = 'rgba(16, 20, 24, 0.8)';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth = 1;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  // Zone bands
  const zones = DEPTH_ZONES;
  for (const z of zones) {
    const y1 = mapY + (z.minDepth / maxDepth) * mapH;
    const y2 = mapY + (z.maxDepth / maxDepth) * mapH;
    ctx.fillStyle = z.waterColor + '80';
    ctx.fillRect(mapX, y1, mapW, y2 - y1);
  }

  // Terrain walls on minimap
  const scale = mapW / (state.worldWidth * 1.5);
  const centerX = mapX + mapW / 2;
  ctx.strokeStyle = '#2a3a4a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < state.terrain.left.length; i += 10) {
    const p = state.terrain.left[i];
    const mx = centerX + p.x * scale;
    const my = mapY + (p.y / maxDepth) * mapH;
    if (i === 0) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < state.terrain.right.length; i += 10) {
    const p = state.terrain.right[i];
    const mx = centerX + p.x * scale;
    const my = mapY + (p.y / maxDepth) * mapH;
    if (i === 0) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
  }
  ctx.stroke();

  // Creature dots
  for (const c of state.creatures) {
    const cx = centerX + c.pos.x * scale;
    const cy = mapY + (c.pos.y / maxDepth) * mapH;
    if (cx > mapX && cx < mapX + mapW && cy > mapY && cy < mapY + mapH) {
      ctx.fillStyle = c.isBoss ? '#ff4500' : c.glowColor;
      ctx.beginPath();
      ctx.arc(cx, cy, c.isBoss ? 3 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sub position
  const subX = centerX + state.sub.pos.x * scale;
  const subY = mapY + (state.sub.pos.y / maxDepth) * mapH;
  ctx.fillStyle = '#00bfff';
  ctx.beginPath();
  ctx.arc(subX, subY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00bfff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(subX, subY, 5, 0, Math.PI * 2);
  ctx.stroke();

  // Label
  ctx.fillStyle = '#6a7a84';
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.fillText('MAP', mapX + 4, mapY + 12);
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
      ctx.fillText('$', p.pos.x - 3, p.pos.y + 3);
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
