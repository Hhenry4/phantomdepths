import React from 'react';

interface HUDProps {
  depth: number;
  hull: number;
  maxHull: number;
  power: number;
  maxPower: number;
  oxygen: number;
  maxOxygen: number;
  zone: string;
  engineNoise: number;
  lightOn: boolean;
  sonarReady: boolean;
  ammo: number;
  maxAmmo: number;
  deepest: number;
  score: number;
  coins: number;
  gameOver: boolean;
  paused: boolean;
  killCount: Record<string, number>;
  activeWeapon: string;
  weaponCount: number;
  xpEarned: number;
  heat: number;
  maxHeat: number;
  currentMap: string;
  onRestart: () => void;
  onReturnToBase: () => void;
  onResumeDive?: () => void;
}

const weaponLabels: Record<string, string> = {
  harpoon: 'HARPOON', shock: 'SHOCK', torpedo: 'TORPEDO', plasma: 'PLASMA',
  flak: 'FLAK', cryo: 'CRYO', railgun: 'RAILGUN', vortex: 'VORTEX',
  needle: 'NEEDLE', net: 'NET GUN', acid: 'ACID SPRAY', mine: 'SEA MINE',
  lance: 'LANCE', pulse: 'PULSE WAVE', drill: 'DRILL SHOT', arc: 'ARC CASTER',
  swarm: 'SWARM MISSILES', nova: 'NOVA CANNON', siphon: 'SIPHON BEAM',
  oblivion: 'OBLIVION ORB', leech: 'LEECH TORPEDO', rift: 'RIFT TEAR',
};

const HUD: React.FC<HUDProps> = ({
  depth, hull, maxHull, power, maxPower, oxygen, maxOxygen,
  zone, engineNoise, lightOn, sonarReady, ammo, maxAmmo,
  deepest, score, coins, gameOver, paused, killCount,
  activeWeapon, weaponCount, xpEarned, heat, maxHeat, currentMap,
  onRestart, onReturnToBase, onResumeDive,
}) => {
  const totalKills = Object.values(killCount).reduce((a, b) => a + b, 0);
  const isVolcanic = currentMap === 'volcanic';
  const heatPercent = (heat / maxHeat) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(180deg, rgba(10, 14, 18, 0.95) 0%, rgba(10, 14, 18, 0) 100%)' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm tracking-widest uppercase font-bold" style={{ color: isVolcanic ? '#ff6600' : '#e0e8ee' }}>
            {isVolcanic ? '🌋 VOLCANIC ABYSS' : zone}
          </span>
          <span className="text-xs font-semibold" style={{ color: '#6a7a88' }}>BEST: {deepest}m</span>
          <span className="text-sm font-bold" style={{ color: '#ffd700' }}>◆ {coins}</span>
          {xpEarned > 0 && <span className="text-sm font-bold" style={{ color: '#e0b0ff' }}>+{xpEarned}xp</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
            color: lightOn ? '#00bfff' : '#3a4a54',
            background: lightOn ? 'rgba(0,191,255,0.1)' : 'transparent',
            border: '1px solid', borderColor: lightOn ? 'rgba(0,191,255,0.3)' : '#1a2a3a',
          }}>LIGHT [F]</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
            color: sonarReady ? '#00ff88' : '#3a4a54',
            background: sonarReady ? 'rgba(0,255,136,0.1)' : 'transparent',
            border: '1px solid', borderColor: sonarReady ? 'rgba(0,255,136,0.3)' : '#1a2a3a',
          }}>SONAR [E]</span>
          <span className="text-sm font-bold" style={{ color: '#ff4500' }}>☠ {totalKills}</span>
        </div>
      </div>

      {/* Left depth gauge */}
      <div
        className="absolute left-0 top-16 bottom-16 w-16 flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(90deg, rgba(10, 14, 18, 0.85) 0%, rgba(10, 14, 18, 0) 100%)' }}
      >
        <span className="text-xs font-bold mb-1" style={{ color: '#6a7a88', fontSize: '9px' }}>DEPTH</span>
        <div className="relative w-2 flex-1 mx-auto rounded-full" style={{ background: '#1a2a3a', maxHeight: '300px' }}>
          <div
            className="absolute bottom-0 w-full rounded-full transition-all"
            style={{
              height: `${Math.min((depth / 8000) * 100, 100)}%`,
              background: isVolcanic ? '#ff4400' : depth > 4000 ? '#ff4500' : depth > 1000 ? '#ff8c00' : '#00bfff',
              boxShadow: `0 0 8px ${isVolcanic ? '#ff4400' : depth > 4000 ? '#ff4500' : depth > 1000 ? '#ff8c00' : '#00bfff'}`,
            }}
          />
        </div>
        <span className="text-lg font-bold mt-2" style={{ color: '#e0e8ee' }}>{depth}m</span>
      </div>

      {/* Bottom telemetry */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-5 px-6 py-3"
        style={{ background: 'linear-gradient(0deg, rgba(10, 14, 18, 0.95) 0%, rgba(10, 14, 18, 0) 100%)' }}
      >
        <TelemetryBar label="HULL" value={hull} max={maxHull} color={hull / maxHull > 0.6 ? '#00ff88' : hull / maxHull > 0.3 ? '#ff8c00' : '#ff4500'} critical={hull / maxHull <= 0.3} />
        <TelemetryBar label="POWER" value={power} max={maxPower} color={power / maxPower > 0.3 ? '#00bfff' : '#ff8c00'} critical={power / maxPower <= 0.15} />
        <TelemetryBar label="O₂" value={oxygen} max={maxOxygen} color={oxygen / maxOxygen > 0.3 ? '#00ff88' : '#ff4500'} critical={oxygen / maxOxygen <= 0.15} />

        {/* Heat meter - only show in volcanic or when heat > 0 */}
        {(isVolcanic || heat > 0) && (
          <div className="flex flex-col items-center gap-1">
            <span className="font-bold" style={{ color: '#ff4400', fontSize: '9px' }}>🔥 HEAT</span>
            <div className="w-20 h-2 rounded-full" style={{ background: '#1a2a3a' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${heatPercent}%`,
                  background: heatPercent > 80 ? '#ff0000' : heatPercent > 50 ? '#ff4400' : '#ff8800',
                  boxShadow: heatPercent > 60 ? `0 0 8px #ff4400` : 'none',
                  opacity: heatPercent > 70 ? (Math.sin(Date.now() / 150) * 0.3 + 0.7) : 1,
                }}
              />
            </div>
            <span className="font-bold" style={{ color: heatPercent > 60 ? '#ff4400' : '#ff8800', fontSize: '12px' }}>
              {Math.floor(heat)}/{maxHeat}
            </span>
          </div>
        )}

        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold" style={{ color: '#6a7a88', fontSize: '9px' }}>NOISE</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-1.5 h-4 rounded-sm" style={{
                background: i < engineNoise * 8 ? (engineNoise > 0.7 ? '#ff4500' : '#ffaa00') : '#1a2a3a',
                boxShadow: i < engineNoise * 8 && engineNoise > 0.7 ? '0 0 4px #ff4500' : 'none',
              }} />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
            color: '#e0e8ee', background: 'rgba(0,191,255,0.15)',
            border: '1px solid rgba(0,191,255,0.3)', fontSize: '10px',
          }}>
            {weaponLabels[activeWeapon] || activeWeapon.toUpperCase()}
          </span>
          <span className="text-sm font-bold" style={{ color: ammo > 3 ? '#e0e8ee' : '#ff4500' }}>
            {ammo}/{maxAmmo}
          </span>
          <div className="flex gap-2">
            <span className="text-xs font-semibold px-1 rounded" style={{ color: '#6a7a88', background: '#1a2a3a', fontSize: '8px' }}>[R] RELOAD</span>
            {weaponCount > 1 && (
              <span className="text-xs font-semibold px-1 rounded" style={{ color: '#6a7a88', background: '#1a2a3a', fontSize: '8px' }}>[Q] SWITCH</span>
            )}
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute right-2 bottom-16 px-2 py-1 rounded" style={{ background: 'rgba(10,14,18,0.6)' }}>
        <div className="flex flex-col gap-0.5 text-right" style={{ color: '#5a6a78', fontSize: '8px', fontWeight: 600 }}>
          <span>WASD MOVE</span>
          <span>CLICK / SPACE FIRE</span>
          <span>ESC PAUSE</span>
        </div>
      </div>

      {/* Heat warning overlay */}
      {heat > 60 && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle, transparent 40%, rgba(255, 68, 0, ${(heat / maxHeat) * 0.15}) 100%)`,
          animation: heat > 80 ? 'pulse 0.5s infinite' : undefined,
        }} />
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto" style={{ background: 'rgba(0, 0, 0, 0.92)' }}>
          <h1 className="text-5xl font-bold mb-3" style={{ color: '#ff4500', textShadow: '0 0 30px rgba(255,69,0,0.4)' }}>
            HULL BREACH
          </h1>
          <p className="text-base mb-1" style={{ color: '#e0e8ee' }}>
            SUBMARINE LOST AT {depth}m {isVolcanic && '(VOLCANIC ABYSS)'}
          </p>
          <p className="text-sm mb-3" style={{ color: '#6a7a88' }}>DEEPEST: {deepest}m — KILLS: {totalKills}</p>
          <div className="flex gap-6 mb-5">
            <span className="text-lg font-bold" style={{ color: '#ffd700' }}>◆ {coins}</span>
            <span className="text-lg font-bold" style={{ color: '#e0b0ff' }}>+{xpEarned} XP</span>
          </div>
          {Object.keys(killCount).length > 0 && (
            <div className="mb-5 text-sm" style={{ color: '#6a7a88' }}>
              {Object.entries(killCount).map(([type, count]) => (
                <span key={type} className="mr-4 font-semibold">{type}: {count}</span>
              ))}
            </div>
          )}
          <div className="flex gap-4">
            <button onClick={onRestart} className="px-8 py-3 text-sm tracking-widest uppercase border-2 hover:bg-white/10 transition-all rounded-lg font-bold" style={{ color: '#e0e8ee', borderColor: '#3a4a5a' }}>
              DIVE AGAIN
            </button>
            <button onClick={onReturnToBase} className="px-8 py-3 text-sm tracking-widest uppercase border-2 hover:bg-yellow-500/10 transition-all rounded-lg font-bold" style={{ color: '#ffd700', borderColor: '#ffd700' }}>
              RETURN TO BASE
            </button>
          </div>
        </div>
      )}

      {/* Pause */}
      {paused && !gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#e0e8ee' }}>SYSTEMS PAUSED</h1>
          <p className="text-sm mt-1 mb-1 font-semibold" style={{ color: '#00ff88' }}>✓ CHECKPOINT SAVED</p>
          <p className="text-sm mb-2" style={{ color: '#6a7a88' }}>
            Depth: {depth}m — Hull: {hull}/{maxHull}
            {isVolcanic && ` — Heat: ${Math.floor(heat)}%`}
          </p>
          <p className="text-xs mb-5" style={{ color: '#4a5a64' }}>Press ESC to resume</p>
          <div className="flex gap-4">
            <button onClick={onReturnToBase} className="px-8 py-3 text-sm tracking-widest uppercase border-2 hover:bg-yellow-500/10 transition-all rounded-lg font-bold" style={{ color: '#ffd700', borderColor: '#ffd700' }}>
              RETURN TO BASE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TelemetryBar: React.FC<{
  label: string; value: number; max: number; color: string; critical?: boolean;
}> = ({ label, value, max, color, critical }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="font-bold" style={{ color: '#6a7a88', fontSize: '9px' }}>{label}</span>
    <div className="w-20 h-2 rounded-full" style={{ background: '#1a2a3a' }}>
      <div className="h-full rounded-full transition-all" style={{
        width: `${(value / max) * 100}%`, background: color,
        boxShadow: critical ? `0 0 8px ${color}` : 'none',
        opacity: critical ? (Math.sin(Date.now() / 200) * 0.3 + 0.7) : 1,
      }} />
    </div>
    <span className="font-bold" style={{ color, fontSize: '12px' }}>{Math.floor(value)}/{max}</span>
  </div>
);

export default HUD;
