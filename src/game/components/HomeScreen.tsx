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
  const { user, signInWithGoogle, logout } = useAuth();
  const xpInfo = getXpProgress(progress.xp);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; s: number; vy: number; a: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        s: 1 + Math.random() * 2,
        vy: -0.2 - Math.random() * 0.3,
        a: 0.1 + Math.random() * 0.3,
      });
    }

    let frame = 0;
    let animId: number;
    const animate = () => {
      frame++;
      ctx.fillStyle = '#010810';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a4a6e20');
      grad.addColorStop(0.5, '#030f1a40');
      grad.addColorStop(1, '#01081080');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        ctx.globalAlpha = p.a;
        ctx.fillStyle = '#e0b0ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.vy;
        p.x += Math.sin(frame / 100 + p.y * 0.01) * 0.3;
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

  const activeQuests = QUESTS.filter(q => !progress.questsCompleted.includes(q.id)).slice(0, 4);
  const completedCount = progress.questsCompleted.length;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {/* Auth section */}
        <div className="absolute top-4 right-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: '#6a7a84' }}>
                {user.displayName || user.email}
              </span>
              <button
                onClick={logout}
                className="text-xs tracking-widest uppercase hover:opacity-80 px-3 py-1 border"
                style={{ color: '#6a7a84', borderColor: '#1a2a3a' }}
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-4 py-2 text-sm tracking-widest uppercase border-2 hover:bg-white hover:bg-opacity-10 transition-colors"
              style={{ color: '#b4c5cf', borderColor: '#b4c5cf' }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              SIGN IN WITH GOOGLE
            </button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-6xl font-bold tracking-wider mb-2" style={{ color: '#b4c5cf', textShadow: '0 0 40px rgba(0, 191, 255, 0.3)' }}>
          PHANTOM DEPTHS
        </h1>
        <p className="text-sm tracking-widest mb-6" style={{ color: '#6a7a84' }}>
          DESCEND INTO THE UNKNOWN
        </p>

        {/* Level & XP bar */}
        <div className="flex flex-col items-center mb-8 w-64">
          <span className="text-xs tracking-widest mb-1" style={{ color: '#e0b0ff' }}>
            LEVEL {xpInfo.level}
          </span>
          <div className="w-full h-2" style={{ background: '#1a2a3a' }}>
            <div
              className="h-full"
              style={{
                width: `${(xpInfo.current / xpInfo.needed) * 100}%`,
                background: '#e0b0ff',
              }}
            />
          </div>
          <span className="text-xs mt-1" style={{ color: '#6a7a84' }}>
            {xpInfo.current} / {xpInfo.needed} XP
          </span>
        </div>

        {/* Stats */}
        <div className="flex gap-8 mb-8">
          <div className="flex flex-col items-center">
            <span className="text-xs" style={{ color: '#6a7a84' }}>DEEPEST</span>
            <span className="text-lg font-bold" style={{ color: '#00bfff' }}>{progress.deepestEver}m</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs" style={{ color: '#6a7a84' }}>COINS</span>
            <span className="text-lg font-bold" style={{ color: '#ffd700' }}>◆ {progress.coins}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs" style={{ color: '#6a7a84' }}>KILLS</span>
            <span className="text-lg font-bold" style={{ color: '#ff4500' }}>{progress.totalKills}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs" style={{ color: '#6a7a84' }}>QUESTS</span>
            <span className="text-lg font-bold" style={{ color: '#e0b0ff' }}>{completedCount}/{QUESTS.length}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={onLaunchDive}
            className="px-10 py-4 text-lg tracking-widest uppercase border-2 hover:bg-opacity-20 hover:bg-cyan-500 transition-all"
            style={{ color: '#00bfff', borderColor: '#00bfff', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            LAUNCH DIVE
          </button>
          <button
            onClick={onOpenShop}
            className="px-10 py-4 text-lg tracking-widest uppercase border-2 hover:bg-opacity-20 hover:bg-yellow-500 transition-all"
            style={{ color: '#ffd700', borderColor: '#ffd700', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            SHOP
          </button>
          <button
            onClick={onMultiplayer}
            className="px-10 py-4 text-lg tracking-widest uppercase border-2 hover:bg-opacity-20 hover:bg-green-500 transition-all"
            style={{ color: '#00ff88', borderColor: '#00ff88', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            MULTIPLAYER
          </button>
        </div>

        {/* Active Quests */}
        {activeQuests.length > 0 && (
          <div className="w-96" style={{ background: 'rgba(16, 20, 24, 0.7)' }}>
            <div className="px-4 py-2 border-b" style={{ borderColor: '#1a2a3a' }}>
              <span className="text-xs tracking-widest" style={{ color: '#6a7a84' }}>ACTIVE MISSIONS ({QUESTS.length - completedCount} remaining)</span>
            </div>
            {activeQuests.map(q => (
              <div key={q.id} className="px-4 py-2 border-b" style={{ borderColor: '#1a2a3a22' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#b4c5cf' }}>{q.name}</span>
                  <div className="flex gap-2">
                    <span className="text-xs" style={{ color: '#ffd700' }}>◆ {q.reward}</span>
                    {q.xpReward > 0 && <span className="text-xs" style={{ color: '#e0b0ff' }}>+{q.xpReward}xp</span>}
                  </div>
                </div>
                <span className="text-xs" style={{ color: '#4a5a64' }}>{q.description}</span>
              </div>
            ))}
          </div>
        )}

        <p className="absolute bottom-8 text-xs" style={{ color: '#3a4a54' }}>
          v0.3.0 — {user ? 'Cloud saves active' : 'Sign in to save progress'} — Something is waiting in the depths.
        </p>
      </div>
    </div>
  );
};

export default HomeScreen;
