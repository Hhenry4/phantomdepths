import { GameState, Creature, SonarPing, Vec2, Particle } from '../types';
import { SUB_WIDTH, SUB_HEIGHT, LIGHT_RADIUS_BASE, DEPTH_ZONES } from '../constants';
import { getZoneConfig } from './Terrain';

export function render(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number) {
  const { sub, camera } = state;
  const zoneConfig = getZoneConfig(sub.depth);

  // Clear with zone water color
  ctx.fillStyle = zoneConfig.waterColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.save();
  ctx.translate(canvasW / 2 - camera.x, canvasH / 2 - camera.y);

  // Draw terrain
  drawTerrain(ctx, state, camera, canvasW, canvasH);

  // Draw particles behind sub
  drawParticles(ctx, state.particles);

  // Draw creatures
  state.creatures.forEach(c => drawCreature(ctx, c, sub.depth));

  // Draw sonar pings
  state.sonarPings.forEach(p => drawSonarPing(ctx, p));

  // Draw submarine
  drawSubmarine(ctx, sub.pos, sub.rotation, sub.lightOn, sub.hull);

  ctx.restore();

  // Darkness overlay (vignette based on depth)
  drawDarknessOverlay(ctx, canvasW, canvasH, zoneConfig.ambientLight, zoneConfig.visibility, sub.lightOn);
}

function drawTerrain(ctx: CanvasRenderingContext2D, state: GameState, camera: Vec2, cw: number, ch: number) {
  const { left, right } = state.terrain;
  const viewTop = camera.y - ch / 2 - 100;
  const viewBottom = camera.y + ch / 2 + 100;

  // Left wall
  ctx.fillStyle = '#0a0e12';
  ctx.beginPath();
  ctx.moveTo(-1000, viewTop);
  for (const p of left) {
    if (p.y >= viewTop - 200 && p.y <= viewBottom + 200) {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.lineTo(-1000, viewBottom);
  ctx.closePath();
  ctx.fill();

  // Right wall
  ctx.beginPath();
  ctx.moveTo(1000, viewTop);
  for (const p of right) {
    if (p.y >= viewTop - 200 && p.y <= viewBottom + 200) {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.lineTo(1000, viewBottom);
  ctx.closePath();
  ctx.fill();

  // Terrain edge glow
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < left.length; i++) {
    const p = left[i];
    if (p.y >= viewTop - 200 && p.y <= viewBottom + 200) {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < right.length; i++) {
    const p = right[i];
    if (p.y >= viewTop - 200 && p.y <= viewBottom + 200) {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();
}

function drawSubmarine(ctx: CanvasRenderingContext2D, pos: Vec2, rotation: number, lightOn: boolean, hull: number) {
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

  // Sub body
  const hullColor = hull > 60 ? '#b4c5cf' : hull > 30 ? '#ff8c00' : '#ff4500';
  ctx.fillStyle = '#1a2a3a';
  ctx.strokeStyle = hullColor;
  ctx.lineWidth = 2;

  // Main hull
  ctx.beginPath();
  ctx.ellipse(0, 0, SUB_WIDTH / 2, SUB_HEIGHT / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Conning tower
  ctx.fillRect(-8, -SUB_HEIGHT / 2 - 8, 16, 8);
  ctx.strokeRect(-8, -SUB_HEIGHT / 2 - 8, 16, 8);

  // Propeller area
  ctx.fillStyle = '#0f1a24';
  ctx.fillRect(-SUB_WIDTH / 2 - 8, -4, 10, 8);

  // Viewport window
  ctx.fillStyle = lightOn ? '#00bfff' : '#1a4a6e';
  ctx.beginPath();
  ctx.arc(SUB_WIDTH / 4, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  // Hull damage cracks
  if (hull < 60) {
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 1;
    ctx.globalAlpha = (60 - hull) / 60;
    for (let i = 0; i < Math.floor((60 - hull) / 10); i++) {
      const cx = (Math.random() - 0.5) * SUB_WIDTH * 0.6;
      const cy = (Math.random() - 0.5) * SUB_HEIGHT * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (Math.random() - 0.5) * 12, cy + (Math.random() - 0.5) * 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawCreature(ctx: CanvasRenderingContext2D, creature: Creature, subDepth: number) {
  const { pos, size, color, glowColor, type, state: cState, health, maxHealth } = creature;

  // Glow effect
  const glowRadius = size * 1.5;
  const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowRadius);
  gradient.addColorStop(0, glowColor + '40');
  gradient.addColorStop(1, glowColor + '00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1.5;

  switch (type) {
    case 'fish':
      drawFish(ctx, pos, size, creature.vel);
      break;
    case 'jellyfish':
      drawJellyfish(ctx, pos, size);
      break;
    case 'angler':
      drawAngler(ctx, pos, size, creature.vel);
      break;
    case 'squid':
      drawSquid(ctx, pos, size, creature.vel);
      break;
    case 'serpent':
      drawSerpent(ctx, pos, size);
      break;
    case 'leviathan':
      drawLeviathan(ctx, pos, size);
      break;
  }

  // Damage indicator
  if (health < maxHealth) {
    const damageRatio = health / maxHealth;
    ctx.globalAlpha = 1 - damageRatio;
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Chase indicator
  if (cState === 'chase') {
    ctx.fillStyle = '#ff4500';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - size - 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

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
  // Tail
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(-size - size / 2, -size / 3);
  ctx.lineTo(-size - size / 2, size / 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawJellyfish(ctx: CanvasRenderingContext2D, pos: Vec2, size: number) {
  // Dome
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  // Tentacles
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
  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Jaw
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.3);
  ctx.lineTo(size * 1.1, size * 0.1);
  ctx.lineTo(size * 0.5, -size * 0.1);
  ctx.stroke();
  // Lure
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.arc(size * 0.3, -size * 0.9, 4, 0, Math.PI * 2);
  ctx.fill();
  // Lure stalk
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
  // Mantle
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Tentacles
  for (let i = 0; i < 6; i++) {
    const tAngle = (i / 6) * Math.PI - Math.PI / 2;
    const wave = Math.sin(Date.now() / 300 + i) * 8;
    ctx.beginPath();
    ctx.moveTo(-size * 0.7, Math.sin(tAngle) * size * 0.3);
    ctx.quadraticCurveTo(-size * 1.2, Math.sin(tAngle) * size * 0.4 + wave, -size * 1.6, Math.sin(tAngle) * size * 0.3);
    ctx.stroke();
  }
  // Eye
  ctx.fillStyle = '#ff4081';
  ctx.beginPath();
  ctx.arc(size * 0.3, -size * 0.1, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSerpent(ctx: CanvasRenderingContext2D, pos: Vec2, size: number) {
  // Sinusoidal body segments
  ctx.lineWidth = size * 0.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  for (let i = 1; i <= 8; i++) {
    const wave = Math.sin(Date.now() / 400 + i) * 15;
    ctx.lineTo(pos.x - i * size * 0.3, pos.y + wave);
  }
  ctx.stroke();
  // Head
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.arc(pos.x + size * 0.15, pos.y - size * 0.1, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawLeviathan(ctx: CanvasRenderingContext2D, pos: Vec2, size: number) {
  // Massive shadowy form
  const gradient = ctx.createRadialGradient(pos.x, pos.y, size * 0.3, pos.x, pos.y, size);
  gradient.addColorStop(0, '#2d1b4e');
  gradient.addColorStop(1, '#2d1b4e00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, size, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glowing eyes
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

  // Tentacle/fin silhouettes
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
  // Main ping ring
  ctx.strokeStyle = `rgba(180, 197, 207, ${ping.alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ping.origin.x, ping.origin.y, ping.radius, 0, Math.PI * 2);
  ctx.stroke();

  // Echo return (in orangered)
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
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
    ctx.fill();
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

  // Central light circle
  const lightRadius = lightOn ? LIGHT_RADIUS_BASE * visibility : LIGHT_RADIUS_BASE * visibility * 0.3;

  const gradient = ctx.createRadialGradient(cw / 2, ch / 2, lightRadius * 0.3, cw / 2, ch / 2, lightRadius);
  gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
  gradient.addColorStop(1, `rgba(0, 0, 0, ${darkness * 0.85})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cw, ch);
}
