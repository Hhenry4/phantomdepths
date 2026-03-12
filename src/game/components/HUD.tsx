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
    <div className="absolute inset-0 pointer-events-none" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3"
        style={{ background: 'rgba(16, 20, 24, 0.85)' }}
      >
        <div className="flex items-center gap-6">
          <span className="text-xs tracking-widest uppercase" style={{ color: '#b4c5cf' }}>
            {zone}
          </span>
          <span className="text-xs" style={{ color: '#6a7a84' }}>
            DEEPEST: {deepest}m
          </span>
          <span className="text-xs" style={{ color: '#ffd700' }}>
            ◆ {coins}
          </span>
          <span className="text-xs" style={{ color: '#e0b0ff' }}>
            XP +{xpEarned}
          </span>
          <span className="text-xs" style={{ color: '#ff4500' }}>
            KILLS: {totalKills}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: lightOn ? '#00bfff' : '#6a7a84' }}>
            LIGHT {lightOn ? 'ON' : 'OFF'} [F]
          </span>
          <span className="text-xs" style={{ color: sonarReady ? '#b4c5cf' : '#6a7a84' }}>
            SONAR {sonarReady ? 'READY' : 'CHARGING'} [E]
          </span>
        </div>
      </div>

      {/* Left panel - Depth gauge */}
      <div
        className="absolute left-0 top-16 bottom-16 w-16 flex flex-col items-center justify-center"
        style={{ background: 'rgba(16, 20, 24, 0.7)' }}
      >
        <span className="text-xs mb-2" style={{ color: '#6a7a84' }}>DEPTH</span>
        <div className="relative w-2 flex-1 mx-auto" style={{ background: '#1a2a3a', maxHeight: '300px' }}>
          <div
            className="absolute bottom-0 w-full"
            style={{
              height: `${Math.min((depth / 8000) * 100, 100)}%`,
              background: depth > 4000 ? '#ff4500' : depth > 1000 ? '#ff8c00' : '#00bfff',
            }}
          />
        </div>
        <span className="text-sm font-bold mt-2" style={{ color: '#b4c5cf' }}>
          {depth}m
        </span>
      </div>

      {/* Bottom telemetry strip */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-6 px-8 py-3"
        style={{ background: 'rgba(16, 20, 24, 0.85)' }}
      >
        <TelemetryBar label="HULL" value={hull} max={maxHull} color={hull / maxHull > 0.6 ? '#b4c5cf' : hull / maxHull > 0.3 ? '#ff8c00' : '#ff4500'} critical={hull / maxHull <= 0.3} />
        <TelemetryBar label="POWER" value={power} max={maxPower} color={power / maxPower > 0.3 ? '#00bfff' : '#ff8c00'} critical={power / maxPower <= 0.15} />
        <TelemetryBar label="O2" value={oxygen} max={maxOxygen} color={oxygen / maxOxygen > 0.3 ? '#00ff88' : '#ff4500'} critical={oxygen / maxOxygen <= 0.15} />
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs" style={{ color: '#6a7a84' }}>NOISE</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-4"
                style={{
                  background: i < engineNoise * 10
                    ? (engineNoise > 0.7 ? '#ff4500' : '#ffaa00')
                    : '#1a2a3a',
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs" style={{ color: '#6a7a84' }}>
            {weaponLabels[activeWeapon] || activeWeapon.toUpperCase()}
          </span>
          <span className="text-sm font-bold" style={{ color: ammo > 5 ? '#b4c5cf' : '#ff4500' }}>
            {ammo}/{maxAmmo}
          </span>
          {weaponCount > 1 && (
            <span className="text-xs" style={{ color: '#4a5a64' }}>[Q] SWITCH</span>
          )}
        </div>
      </div>

      {/* Controls hint */}
      <div
        className="absolute right-0 bottom-16 px-3 py-2"
        style={{ background: 'rgba(16, 20, 24, 0.6)' }}
      >
        <div className="flex flex-col gap-1 text-xs" style={{ color: '#4a5a64' }}>
          <span>WASD / ↑↓←→ MOVE</span>
          <span>SPACE — FIRE</span>
          <span>Q — SWITCH WEAPON</span>
          <span>E — SONAR</span>
          <span>F — LIGHT</span>
          <span>ESC — PAUSE</span>
        </div>
      </div>

      {/* Game Over overlay */}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto" style={{ background: 'rgba(0, 0, 0, 0.85)' }}>
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#ff4500', fontFamily: "'IBM Plex Mono', monospace" }}>
            HULL BREACH
          </h1>
          <p className="text-lg mb-1" style={{ color: '#b4c5cf' }}>
            SUBMARINE LOST AT {depth}m
          </p>
          <p className="text-sm mb-2" style={{ color: '#6a7a84' }}>
            DEEPEST: {deepest}m — KILLS: {totalKills}
          </p>
          <div className="flex gap-6 mb-2">
            <span className="text-sm" style={{ color: '#ffd700' }}>◆ {coins}</span>
            <span className="text-sm" style={{ color: '#e0b0ff' }}>XP +{xpEarned}</span>
          </div>
          {/* Kill breakdown */}
          {Object.keys(killCount).length > 0 && (
            <div className="mb-4 text-xs" style={{ color: '#6a7a84' }}>
              {Object.entries(killCount).map(([type, count]) => (
                <span key={type} className="mr-3">{type}: {count}</span>
              ))}
            </div>
          )}
          <div className="flex gap-4">
            <button
              onClick={onRestart}
              className="px-6 py-3 text-sm tracking-widest uppercase border-2 hover:bg-white hover:bg-opacity-10 transition-colors"
              style={{ color: '#b4c5cf', borderColor: '#b4c5cf', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              DIVE AGAIN
            </button>
            <button
              onClick={onReturnToBase}
              className="px-6 py-3 text-sm tracking-widest uppercase border-2 hover:bg-white hover:bg-opacity-10 transition-colors"
              style={{ color: '#ffd700', borderColor: '#ffd700', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              RETURN TO BASE
            </button>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {paused && !gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto" style={{ background: 'rgba(0, 0, 0, 0.6)' }}>
          <h1 className="text-2xl font-bold" style={{ color: '#b4c5cf', fontFamily: "'IBM Plex Mono', monospace" }}>
            SYSTEMS PAUSED
          </h1>
          <p className="text-xs mt-1" style={{ color: '#00ff88' }}>PROGRESS AUTO-SAVED</p>
          <p className="text-sm mt-2 mb-6" style={{ color: '#6a7a84' }}>
            PRESS ESC TO RESUME
          </p>
          <button
            onClick={onReturnToBase}
            className="px-6 py-3 text-sm tracking-widest uppercase border-2 hover:bg-white hover:bg-opacity-10 transition-colors"
            style={{ color: '#ffd700', borderColor: '#ffd700', fontFamily: "'IBM Plex Mono', monospace" }}
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
  <div className="flex flex-col items-center gap-1">
    <span className="text-xs" style={{ color: '#6a7a84' }}>{label}</span>
    <div className="w-20 h-2" style={{ background: '#1a2a3a' }}>
      <div
        className="h-full"
        style={{
          width: `${(value / max) * 100}%`,
          background: color,
          opacity: critical ? (Math.sin(Date.now() / 200) * 0.3 + 0.7) : 1,
        }}
      />
    </div>
    <span className="text-xs font-bold" style={{ color }}>
      {Math.floor(value)}/{max}
    </span>
  </div>
);

export default HUD;
