import React, { useEffect, useRef } from 'react';
import { PlayerProgress, getXpProgress } from '../types';
import { QUESTS } from '../constants';
import { useAuth } from '../../firebase/AuthContext';

interface HomeScreenProps {
  progress: PlayerProgress;
  onLaunchDive: () => void;
  onOpenShop: () => void;
  onMultiplayer: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ progress, onLaunchDive, onOpenShop, onMultiplayer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user, signInWithGoogle, logout, loading } = useAuth();
  const xpInfo = getXpProgress(progress.xp);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; s: number; vy: number; vx: number; a: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        s: 1 + Math.random() * 2,
        vy: -0.15 - Math.random() * 0.2,
        vx: (Math.random() - 0.5) * 0.3,
        a: 0.05 + Math.random() * 0.2,
      });
    }

    let frame = 0;
    let animId: number;
    const animate = () => {
      frame++;
      // Deep ocean gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#030f1a');
      grad.addColorStop(0.4, '#010810');
      grad.addColorStop(1, '#000408');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle current lines
      ctx.globalAlpha = 0.02;
      ctx.strokeStyle = '#00bfff';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const y = canvas.height * 0.3 + i * 80;
        for (let x = 0; x < canvas.width; x += 10) {
          ctx.lineTo(x, y + Math.sin(x * 0.005 + frame * 0.01 + i) * 20);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (const p of particles) {
        ctx.globalAlpha = p.a;
        ctx.fillStyle = Math.random() > 0.9 ? '#00bfff' : '#e0b0ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.vy;
        p.x += p.vx + Math.sin(frame / 100 + p.y * 0.01) * 0.2;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
      }
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const activeQuests = QUESTS.filter(q => !progress.questsCompleted.includes(q.id)).slice(0, 3);
  const completedCount = progress.questsCompleted.length;

  // Must sign in to play
  if (loading) {
    return (
      <div className="relative w-full h-screen overflow-hidden flex items-center justify-center" style={{ background: '#010810', fontFamily: "'IBM Plex Mono', monospace" }}>
        <p style={{ color: '#4a5a64' }}>INITIALIZING...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <h1 className="text-5xl font-bold tracking-wider mb-2" style={{ color: '#b4c5cf', textShadow: '0 0 60px rgba(0, 191, 255, 0.2)' }}>
            PHANTOM DEPTHS
          </h1>
          <p className="text-xs tracking-widest mb-10" style={{ color: '#4a5a64' }}>
            DESCEND INTO THE UNKNOWN
          </p>
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-3 px-6 py-3 text-sm tracking-widest uppercase border-2 hover:bg-white/5 transition-all rounded-lg"
            style={{ color: '#b4c5cf', borderColor: '#2a3a4a' }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            SIGN IN WITH GOOGLE
          </button>
          <p className="mt-4 text-xs" style={{ color: '#3a4a54' }}>Sign in to save your progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {/* Auth */}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#4a5a64' }}>
              {user.displayName || user.email}
            </span>
            <button
              onClick={logout}
              className="text-xs tracking-widest uppercase hover:opacity-80 px-2 py-1 border rounded"
              style={{ color: '#4a5a64', borderColor: '#1a2a3a' }}
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold tracking-wider mb-1" style={{ color: '#b4c5cf', textShadow: '0 0 60px rgba(0, 191, 255, 0.2)' }}>
          PHANTOM DEPTHS
        </h1>
        <p className="text-xs tracking-widest mb-5" style={{ color: '#4a5a64' }}>
          DESCEND INTO THE UNKNOWN
        </p>

        {/* Level */}
        <div className="flex flex-col items-center mb-5 w-56">
          <span className="text-xs tracking-widest mb-1" style={{ color: '#e0b0ff' }}>
            LEVEL {xpInfo.level}
          </span>
          <div className="w-full h-1.5 rounded-full" style={{ background: '#1a2a3a' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(xpInfo.current / xpInfo.needed) * 100}%`,
                background: 'linear-gradient(90deg, #e0b0ff, #7b2fff)',
              }}
            />
          </div>
          <span className="text-xs mt-0.5" style={{ color: '#4a5a64', fontSize: '9px' }}>
            {xpInfo.current} / {xpInfo.needed} XP
          </span>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-6">
          <Stat label="DEEPEST" value={`${progress.deepestEver}m`} color="#00bfff" />
          <Stat label="COINS" value={`◆ ${progress.coins}`} color="#ffd700" />
          <Stat label="KILLS" value={`${progress.totalKills}`} color="#ff4500" />
          <Stat label="QUESTS" value={`${completedCount}/${QUESTS.length}`} color="#e0b0ff" />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mb-6">
          {progress.runCheckpoint && (
            <button
              onClick={onLaunchDive}
              className="px-8 py-3 text-sm tracking-widest uppercase border-2 hover:bg-green-500/10 transition-all rounded-lg animate-pulse"
              style={{ color: '#00ff88', borderColor: '#00ff88' }}
            >
              RESUME DIVE ({Math.floor(progress.runCheckpoint.depth)}m)
            </button>
          )}
          <button
            onClick={() => {
              // Clear checkpoint for fresh dive
              onLaunchDive();
            }}
            className="px-8 py-3 text-sm tracking-widest uppercase border-2 hover:bg-cyan-500/10 transition-all rounded-lg"
            style={{ color: '#00bfff', borderColor: '#00bfff' }}
          >
            {progress.runCheckpoint ? 'NEW DIVE' : 'LAUNCH DIVE'}
          </button>
          <button
            onClick={onOpenShop}
            className="px-8 py-3 text-sm tracking-widest uppercase border-2 hover:bg-yellow-500/10 transition-all rounded-lg"
            style={{ color: '#ffd700', borderColor: '#ffd700' }}
          >
            SHOP
          </button>
          <button
            onClick={onMultiplayer}
            className="px-8 py-3 text-sm tracking-widest uppercase border-2 hover:bg-green-500/10 transition-all rounded-lg"
            style={{ color: '#00ff88', borderColor: '#00ff88' }}
          >
            MULTIPLAYER
          </button>
        </div>

        {/* Active Quests */}
        {activeQuests.length > 0 && (
          <div className="w-80 rounded-lg overflow-hidden" style={{ background: 'rgba(16, 20, 24, 0.8)' }}>
            <div className="px-3 py-1.5 border-b" style={{ borderColor: '#1a2a3a' }}>
              <span className="text-xs tracking-widest" style={{ color: '#4a5a64', fontSize: '9px' }}>
                MISSIONS ({QUESTS.length - completedCount} remaining)
              </span>
            </div>
            {activeQuests.map(q => (
              <div key={q.id} className="px-3 py-1.5 border-b" style={{ borderColor: '#1a2a3a15' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#b4c5cf', fontSize: '10px' }}>{q.name}</span>
                  <div className="flex gap-1.5">
                    <span style={{ color: '#ffd700', fontSize: '9px' }}>◆{q.reward}</span>
                    {q.xpReward > 0 && <span style={{ color: '#e0b0ff', fontSize: '9px' }}>+{q.xpReward}xp</span>}
                  </div>
                </div>
                <span style={{ color: '#3a4a54', fontSize: '9px' }}>{q.description}</span>
              </div>
            ))}
          </div>
        )}

        <p className="absolute bottom-4 text-xs" style={{ color: '#2a3a44', fontSize: '9px' }}>
          v0.5.0 — Cloud saves active — Something is waiting in the depths.
        </p>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="flex flex-col items-center">
    <span style={{ color: '#4a5a64', fontSize: '9px' }}>{label}</span>
    <span className="text-base font-bold" style={{ color }}>{value}</span>
  </div>
);

export default HomeScreen;
