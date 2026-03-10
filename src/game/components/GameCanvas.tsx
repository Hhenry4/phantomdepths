import React, { useRef, useEffect, useCallback, useState } from 'react';
import { InputManager } from '../engine/Input';
import { createInitialState, updateGame, renderGame } from '../engine/GameLoop';
import { GameState } from '../types';
import HUD from './HUD';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputManager | null>(null);
  const animFrameRef = useRef<number>(0);
  const [hudState, setHudState] = useState({
    depth: 0,
    hull: 100,
    power: 100,
    oxygen: 100,
    zone: 'Sunlight Zone',
    engineNoise: 0,
    lightOn: true,
    sonarReady: true,
    ammo: 20,
    deepest: 0,
    score: 0,
    gameOver: false,
    paused: false,
  });

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !inputRef.current) return;

    const state = stateRef.current;

    // Toggle pause
    if (inputRef.current.wasPressed('Escape')) {
      state.paused = !state.paused;
    }

    updateGame(state, inputRef.current, 1);
    renderGame(ctx, state, canvas.width, canvas.height);

    // Update HUD state (throttled to every 3 frames)
    if (state.time % 3 === 0) {
      const zoneNames: Record<string, string> = {
        sunlight: 'Sunlight Zone',
        twilight: 'Twilight Zone',
        midnight: 'Midnight Zone',
        abyssal: 'Abyssal Plains',
        hadal: 'Hadal Trench',
      };
      setHudState({
        depth: Math.floor(state.sub.depth),
        hull: Math.floor(state.sub.hull),
        power: Math.floor(state.sub.power),
        oxygen: Math.floor(state.sub.oxygen),
        zone: zoneNames[state.currentZone] || state.currentZone,
        engineNoise: state.sub.engineNoise,
        lightOn: state.sub.lightOn,
        sonarReady: state.sub.sonarCooldown <= 0,
        ammo: state.sub.weapons[0]?.ammo ?? 0,
        deepest: Math.floor(state.deepestDepth),
        score: state.score,
        gameOver: state.gameOver,
        paused: state.paused,
      });
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const handleRestart = useCallback(() => {
    stateRef.current = createInitialState();
  }, []);

  useEffect(() => {
    inputRef.current = new InputManager();

    const canvas = canvasRef.current;
    if (canvas) {
      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      resize();
      window.addEventListener('resize', resize);
      animFrameRef.current = requestAnimationFrame(gameLoop);

      return () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animFrameRef.current);
        inputRef.current?.destroy();
      };
    }
  }, [gameLoop]);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#010810' }}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ imageRendering: 'auto' }}
      />
      <HUD {...hudState} onRestart={handleRestart} />
    </div>
  );
};

export default GameCanvas;
