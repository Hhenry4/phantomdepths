import React, { useEffect, useRef } from 'react';
import { PlayerProgress } from '../types';
import { QUESTS } from '../constants';

interface HomeScreenProps {
  progress: PlayerProgress;
  onLaunchDive: () => void;
  onOpenShop: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ progress, onLaunchDive, onOpenShop }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated background
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
    const animate = () => {
      frame++;
      ctx.fillStyle = '#010810';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Water gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a4a6e20');
      grad.addColorStop(0.5, '#030f1a40');
      grad.addColorStop(1, '#01081080');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Particles
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

      requestAnimationFrame(animate);
    };
    const id = requestAnimationFrame(animate);

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const activeQuests = QUESTS.filter(q => !progress.questsCompleted.includes(q.id)).slice(0, 3);
  const completedCount = progress.questsCompleted.length;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {/* Title */}
        <h1 className="text-6xl font-bold tracking-wider mb-2" style={{ color: '#b4c5cf', textShadow: '0 0 40px rgba(0, 191, 255, 0.3)' }}>
          PHANTOM DEPTHS
        </h1>
        <p className="text-sm tracking-widest mb-12" style={{ color: '#6a7a84' }}>
          DESCEND INTO THE UNKNOWN
        </p>

        {/* Stats row */}
        <div className="flex gap-8 mb-10">
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
        <div className="flex gap-4 mb-10">
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
            UPGRADES
          </button>
        </div>

        {/* Active Quests */}
        {activeQuests.length > 0 && (
          <div className="w-80" style={{ background: 'rgba(16, 20, 24, 0.7)' }}>
            <div className="px-4 py-2 border-b" style={{ borderColor: '#1a2a3a' }}>
              <span className="text-xs tracking-widest" style={{ color: '#6a7a84' }}>ACTIVE MISSIONS</span>
            </div>
            {activeQuests.map(q => (
              <div key={q.id} className="px-4 py-2 border-b" style={{ borderColor: '#1a2a3a22' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#b4c5cf' }}>{q.name}</span>
                  <span className="text-xs" style={{ color: '#ffd700' }}>◆ {q.reward}</span>
                </div>
                <span className="text-xs" style={{ color: '#4a5a64' }}>{q.description}</span>
              </div>
            ))}
          </div>
        )}

        <p className="absolute bottom-8 text-xs" style={{ color: '#3a4a54' }}>
          v0.2.0 — Something is waiting in the depths.
        </p>
      </div>
    </div>
  );
};

export default HomeScreen;
