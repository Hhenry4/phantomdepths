import React, { useState } from 'react';

const STEPS = [
  {
    title: 'WELCOME TO PHANTOM DEPTHS',
    text: 'You are a deep-sea submarine pilot. Your mission: explore the ocean depths, fight creatures, and survive.',
  },
  {
    title: 'MOVEMENT',
    text: 'Use WASD or Arrow Keys to move your submarine. Your sub will rotate to face the direction you move.',
  },
  {
    title: 'COMBAT',
    text: 'Press SPACE to fire your harpoon at creatures. Aim by moving in the direction you want to shoot.',
  },
  {
    title: 'SYSTEMS',
    text: 'Press F to toggle your headlight. Press E to send a sonar ping that reveals nearby creatures and terrain.',
  },
  {
    title: 'SURVIVAL',
    text: 'Watch your HULL (damage), OXYGEN, and POWER gauges. If hull or O2 hits zero, your dive ends. Return to base to keep your coins.',
  },
  {
    title: 'DEPTH ZONES',
    text: 'Deeper zones have stronger creatures and pressure damage. Upgrade your sub at the shop to survive deeper dives.',
  },
  {
    title: 'UPGRADES & WEAPONS',
    text: 'Earn coins by killing creatures. Buy upgrades and new weapons in the shop. Shock Cannons stun, Torpedoes deal massive damage.',
  },
  {
    title: 'MULTIPLAYER',
    text: 'Create or join a room from the home screen. Share the room code and password with friends to dive together!',
  },
  {
    title: 'READY TO DIVE',
    text: 'Press ESC to pause mid-dive. Good luck, pilot. Something ancient waits below...',
  },
];

interface TutorialProps {
  onComplete: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const current = STEPS[step];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.92)', fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="max-w-lg w-full mx-4">
        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1"
              style={{ background: i <= step ? '#00bfff' : '#1a2a3a' }}
            />
          ))}
        </div>

        <div className="p-8 border" style={{ background: 'rgba(16, 20, 24, 0.95)', borderColor: '#1a2a3a' }}>
          <span className="text-xs tracking-widest" style={{ color: '#6a7a84' }}>
            BRIEFING {step + 1}/{STEPS.length}
          </span>
          <h2 className="text-xl font-bold mt-2 mb-4" style={{ color: '#00bfff' }}>
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#b4c5cf' }}>
            {current.text}
          </p>

          <div className="flex justify-between items-center">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-xs tracking-widest uppercase hover:opacity-80"
                style={{ color: '#6a7a84' }}
              >
                ← BACK
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="text-xs tracking-widest uppercase hover:opacity-80"
                style={{ color: '#6a7a84' }}
              >
                SKIP
              </button>
            )}

            <button
              onClick={() => {
                if (step < STEPS.length - 1) setStep(s => s + 1);
                else onComplete();
              }}
              className="px-6 py-2 text-sm tracking-widest uppercase border-2 hover:bg-cyan-500 hover:bg-opacity-20 transition-colors"
              style={{ color: '#00bfff', borderColor: '#00bfff' }}
            >
              {step < STEPS.length - 1 ? 'NEXT →' : 'BEGIN DESCENT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
