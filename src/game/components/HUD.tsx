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
  onRestart: () => void;
  onReturnToBase: () => void;
}

const weaponLabels: Record<string, string> = {
  harpoon: 'HARPOON',
  shock: 'SHOCK',
  torpedo: 'TORPEDO',
  plasma: 'PLASMA',
  flak: 'FLAK',
  cryo: 'CRYO',
  railgun: 'RAILGUN',
  vortex: 'VORTEX',
};

const HUD: React.FC<HUDProps> = ({
  depth, hull, maxHull, power, maxPower, oxygen, maxOxygen,
  zone, engineNoise, lightOn, sonarReady, ammo, maxAmmo,
  deepest, score, coins, gameOver, paused, killCount,
  activeWeapon, weaponCount, xpEarned,
  onRestart, onReturnToBase,
}) => {
  const totalKills = Object.values(killCount).reduce((a, b) => a + b, 0);

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2"
        style={{ background: 'linear-gradient(180deg, rgba(10, 14, 18, 0.9) 0%, rgba(10, 14, 18, 0) 100%)' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-xs tracking-widest uppercase" style={{ color: '#b4c5cf' }}>
            {zone}
          </span>
          <span className="text-xs" style={{ color: '#4a5a64' }}>
            BEST: {deepest}m
          </span>
          <span className="text-xs" style={{ color: '#ffd700' }}>
            ◆ {coins}
          </span>
          {xpEarned > 0 && (
            <span className="text-xs" style={{ color: '#e0b0ff' }}>
              +{xpEarned}xp
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: lightOn ? '#00bfff' : '#3a4a54' }}>
            LIGHT [F]
          </span>
          <span className="text-xs" style={{ color: sonarReady ? '#b4c5cf' : '#3a4a54' }}>
            SONAR [E]
          </span>
          <span className="text-xs" style={{ color: '#ff4500' }}>
            ×{totalKills}
          </span>
        </div>
      </div>

      {/* Left depth gauge */}
      <div
        className="absolute left-0 top-12 bottom-12 w-12 flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(90deg, rgba(10, 14, 18, 0.8) 0%, rgba(10, 14, 18, 0) 100%)' }}
      >
        <span className="text-xs mb-1" style={{ color: '#4a5a64', fontSize: '8px' }}>DEPTH</span>
        <div className="relative w-1.5 flex-1 mx-auto rounded-full" style={{ background: '#1a2a3a', maxHeight: '300px' }}>
          <div
            className="absolute bottom-0 w-full rounded-full transition-all"
            style={{
              height: `${Math.min((depth / 8000) * 100, 100)}%`,
              background: depth > 4000 ? '#ff4500' : depth > 1000 ? '#ff8c00' : '#00bfff',
            }}
          />
        </div>
        <span className="text-sm font-bold mt-1" style={{ color: '#b4c5cf', fontSize: '11px' }}>
          {depth}m
        </span>
      </div>

      {/* Bottom telemetry */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-5 px-6 py-2"
        style={{ background: 'linear-gradient(0deg, rgba(10, 14, 18, 0.9) 0%, rgba(10, 14, 18, 0) 100%)' }}
      >
        <TelemetryBar label="HULL" value={hull} max={maxHull} color={hull / maxHull > 0.6 ? '#b4c5cf' : hull / maxHull > 0.3 ? '#ff8c00' : '#ff4500'} critical={hull / maxHull <= 0.3} />
        <TelemetryBar label="PWR" value={power} max={maxPower} color={power / maxPower > 0.3 ? '#00bfff' : '#ff8c00'} critical={power / maxPower <= 0.15} />
        <TelemetryBar label="O2" value={oxygen} max={maxOxygen} color={oxygen / maxOxygen > 0.3 ? '#00ff88' : '#ff4500'} critical={oxygen / maxOxygen <= 0.15} />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs" style={{ color: '#4a5a64', fontSize: '8px' }}>NOISE</span>
          <div className="flex gap-px">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-1 h-3 rounded-sm"
                style={{
                  background: i < engineNoise * 8
                    ? (engineNoise > 0.7 ? '#ff4500' : '#ffaa00')
                    : '#1a2a3a',
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs" style={{ color: '#4a5a64', fontSize: '8px' }}>
            {weaponLabels[activeWeapon] || activeWeapon.toUpperCase()}
          </span>
          <span className="text-xs font-bold" style={{ color: ammo > 3 ? '#b4c5cf' : '#ff4500', fontSize: '11px' }}>
            {ammo}/{maxAmmo}
          </span>
          <span className="text-xs" style={{ color: '#3a4a54', fontSize: '7px' }}>[R] RELOAD</span>
          {weaponCount > 1 && (
            <span className="text-xs" style={{ color: '#3a4a54', fontSize: '7px' }}>[Q] SWITCH</span>
          )}
        </div>
      </div>

      {/* Controls hint - compact */}
      <div className="absolute right-0 bottom-12 px-2 py-1" style={{ opacity: 0.4 }}>
        <div className="flex flex-col gap-0.5 text-right" style={{ color: '#3a4a54', fontSize: '7px' }}>
          <span>WASD MOVE</span>
          <span>FACE TO AIM</span>
          <span>CLICK/SPACE FIRE</span>
          <span>ESC PAUSE</span>
        </div>
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto" style={{ background: 'rgba(0, 0, 0, 0.88)' }}>
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#ff4500' }}>
            HULL BREACH
          </h1>
          <p className="text-sm mb-1" style={{ color: '#b4c5cf' }}>
            SUBMARINE LOST AT {depth}m
          </p>
          <p className="text-xs mb-2" style={{ color: '#4a5a64' }}>
            DEEPEST: {deepest}m — KILLS: {totalKills}
          </p>
          <div className="flex gap-4 mb-4">
            <span className="text-sm" style={{ color: '#ffd700' }}>◆ {coins}</span>
            <span className="text-sm" style={{ color: '#e0b0ff' }}>+{xpEarned} XP</span>
          </div>
          {Object.keys(killCount).length > 0 && (
            <div className="mb-4 text-xs" style={{ color: '#4a5a64' }}>
              {Object.entries(killCount).map(([type, count]) => (
                <span key={type} className="mr-3">{type}: {count}</span>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onRestart}
              className="px-6 py-2.5 text-xs tracking-widest uppercase border hover:bg-white/5 transition-colors rounded"
              style={{ color: '#b4c5cf', borderColor: '#2a3a4a' }}
            >
              DIVE AGAIN
            </button>
            <button
              onClick={onReturnToBase}
              className="px-6 py-2.5 text-xs tracking-widest uppercase border hover:bg-white/5 transition-colors rounded"
              style={{ color: '#ffd700', borderColor: '#ffd700' }}
            >
              RETURN TO BASE
            </button>
          </div>
        </div>
      )}

      {/* Pause */}
      {paused && !gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
          <h1 className="text-xl font-bold" style={{ color: '#b4c5cf' }}>
            SYSTEMS PAUSED
          </h1>
          <p className="text-xs mt-1 mb-1" style={{ color: '#00ff88' }}>CHECKPOINT SAVED TO CLOUD</p>
          <p className="text-xs mb-4" style={{ color: '#4a5a64' }}>
            ESC TO RESUME
          </p>
          <button
            onClick={onReturnToBase}
            className="px-6 py-2.5 text-xs tracking-widest uppercase border hover:bg-white/5 transition-colors rounded"
            style={{ color: '#ffd700', borderColor: '#ffd700' }}
          >
            RETURN TO BASE
          </button>
        </div>
      )}
    </div>
  );
};

const TelemetryBar: React.FC<{
  label: string;
  value: number;
  max: number;
  color: string;
  critical?: boolean;
}> = ({ label, value, max, color, critical }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span style={{ color: '#4a5a64', fontSize: '8px' }}>{label}</span>
    <div className="w-16 h-1.5 rounded-full" style={{ background: '#1a2a3a' }}>
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${(value / max) * 100}%`,
          background: color,
          opacity: critical ? (Math.sin(Date.now() / 200) * 0.3 + 0.7) : 1,
        }}
      />
    </div>
    <span className="font-bold" style={{ color, fontSize: '10px' }}>
      {Math.floor(value)}/{max}
    </span>
  </div>
);

export default HUD;
