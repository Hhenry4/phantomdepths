import React from 'react';

interface HUDProps {
  depth: number;
  hull: number;
  power: number;
  oxygen: number;
  zone: string;
  engineNoise: number;
  lightOn: boolean;
  sonarReady: boolean;
  ammo: number;
  deepest: number;
  score: number;
  gameOver: boolean;
  paused: boolean;
  onRestart: () => void;
}

const HUD: React.FC<HUDProps> = ({
  depth, hull, power, oxygen, zone, engineNoise, lightOn,
  sonarReady, ammo, deepest, gameOver, paused, onRestart,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Top bar - Zone & Depth */}
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
            className="absolute bottom-0 w-full transition-none"
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
        className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-8 px-8 py-3"
        style={{ background: 'rgba(16, 20, 24, 0.85)' }}
      >
        <TelemetryBar label="HULL" value={hull} max={100} color={hull > 60 ? '#b4c5cf' : hull > 30 ? '#ff8c00' : '#ff4500'} critical={hull <= 30} />
        <TelemetryBar label="POWER" value={power} max={100} color={power > 30 ? '#00bfff' : '#ff8c00'} critical={power <= 15} />
        <TelemetryBar label="O2" value={oxygen} max={100} color={oxygen > 30 ? '#00ff88' : '#ff4500'} critical={oxygen <= 15} />
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
          <span className="text-xs" style={{ color: '#6a7a84' }}>HARPOON</span>
          <span className="text-sm font-bold" style={{ color: ammo > 5 ? '#b4c5cf' : '#ff4500' }}>
            {ammo}
          </span>
        </div>
      </div>

      {/* Right panel - Controls hint */}
      <div
        className="absolute right-0 bottom-16 px-3 py-2"
        style={{ background: 'rgba(16, 20, 24, 0.6)' }}
      >
        <div className="flex flex-col gap-1 text-xs" style={{ color: '#4a5a64' }}>
          <span>WASD / ↑↓←→ MOVE</span>
          <span>SPACE — FIRE</span>
          <span>E — SONAR</span>
          <span>F — LIGHT</span>
          <span>ESC — PAUSE</span>
        </div>
      </div>

      {/* Game Over overlay */}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#ff4500', fontFamily: "'IBM Plex Mono', monospace" }}>
            HULL BREACH
          </h1>
          <p className="text-lg mb-1" style={{ color: '#b4c5cf' }}>
            SUBMARINE LOST AT {depth}m
          </p>
          <p className="text-sm mb-6" style={{ color: '#6a7a84' }}>
            DEEPEST DESCENT: {deepest}m
          </p>
          <button
            onClick={onRestart}
            className="px-8 py-3 text-sm tracking-widest uppercase border-2 hover:bg-white hover:bg-opacity-10 transition-colors"
            style={{ color: '#b4c5cf', borderColor: '#b4c5cf', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            LAUNCH AGAIN
          </button>
        </div>
      )}

      {/* Pause overlay */}
      {paused && !gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.6)' }}>
          <h1 className="text-2xl font-bold" style={{ color: '#b4c5cf', fontFamily: "'IBM Plex Mono', monospace" }}>
            SYSTEMS PAUSED
          </h1>
          <p className="text-sm mt-2" style={{ color: '#6a7a84' }}>
            PRESS ESC TO RESUME
          </p>
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
        className="h-full transition-none"
        style={{
          width: `${(value / max) * 100}%`,
          background: color,
          opacity: critical ? (Math.sin(Date.now() / 200) * 0.3 + 0.7) : 1,
        }}
      />
    </div>
    <span className="text-xs font-bold" style={{ color }}>
      {value}%
    </span>
  </div>
);

export default HUD;
