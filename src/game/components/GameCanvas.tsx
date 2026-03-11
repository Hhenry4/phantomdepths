import React, { useRef, useEffect, useCallback, useState } from 'react';
import { InputManager } from '../engine/Input';
import { createInitialState, resetBossTracker, updateGame } from '../engine/GameLoop';
import { render } from '../engine/Renderer';
import { GameState, PlayerProgress } from '../types';
import HUD from './HUD';

interface GameCanvasProps {
  progress: PlayerProgress;
  onGameEnd: (coins: number, deepest: number, kills: number, killCount: Record<string, number>, bossesDefeated: string[]) => void;
  onReturnToBase: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ progress, onGameEnd, onReturnToBase }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const animFrameRef = useRef<number>(0);
  const [hudState, setHudState] = useState({
    depth: 0, hull: 100, maxHull: 100, power: 100, maxPower: 100,
    oxygen: 100, maxOxygen: 100, zone: 'Sunlight Zone',
    engineNoise: 0, lightOn: true, sonarReady: true,
    ammo: 20, maxAmmo: 20, deepest: 0, score: 0, coins: 0,
    gameOver: false, paused: false, killCount: {} as Record<string, number>,
  });

  const initGame = useCallback(() => {
    resetBossTracker();
    stateRef.current = createInitialState(progress);
  }, [progress]);

  useEffect(() => { initGame(); }, [initGame]);

  const updateHud = useCallback((state: GameState) => {
    const zoneNames: Record<string, string> = {
      sunlight: 'Sunlight Zone', twilight: 'Twilight Zone',
      midnight: 'Midnight Zone', abyssal: 'Abyssal Plains', hadal: 'Hadal Trench',
    };
    setHudState({
      depth: Math.floor(state.sub.depth),
      hull: Math.floor(state.sub.hull),
      maxHull: state.sub.maxHull,
      power: Math.floor(state.sub.power),
      maxPower: state.sub.maxPower,
      oxygen: Math.floor(state.sub.oxygen),
      maxOxygen: state.sub.maxOxygen,
      zone: zoneNames[state.currentZone] || state.currentZone,
      engineNoise: state.sub.engineNoise,
      lightOn: state.sub.lightOn,
      sonarReady: state.sub.sonarCooldown <= 0,
      ammo: state.sub.weapons[0]?.ammo ?? 0,
      maxAmmo: state.sub.weapons[0]?.maxAmmo ?? 20,
      deepest: Math.floor(state.deepestDepth),
      score: state.score,
      coins: state.coins,
      gameOver: state.gameOver,
      paused: state.paused,
      killCount: { ...state.killCount },
    });
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const state = stateRef.current;
    if (!canvas || !ctx || !inputRef.current || !state) return;

    // Toggle pause
    if (inputRef.current.wasPressed('Escape')) {
      state.paused = !state.paused;
    }

    if (!state.paused && !state.gameOver) {
      updateGame(state, inputRef.current, 1);
    } else {
      inputRef.current.clearFrame();
    }

    // Always render
    render(ctx, state, canvas.width, canvas.height);

    // Always update HUD (fixes game over freeze bug)
    if (state.time % 3 === 0 || state.gameOver || state.paused) {
      updateHud(state);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [updateHud]);

  const handleRestart = useCallback(() => {
    const state = stateRef.current;
    if (state) {
      onGameEnd(state.coins, state.deepestDepth, Object.values(state.killCount).reduce((a, b) => a + b, 0), state.killCount, state.bossesDefeated);
    }
    initGame();
  }, [initGame, onGameEnd]);

  const handleReturnToBase = useCallback(() => {
    const state = stateRef.current;
    if (state) {
      onGameEnd(state.coins, state.deepestDepth, Object.values(state.killCount).reduce((a, b) => a + b, 0), state.killCount, state.bossesDefeated);
    }
    onReturnToBase();
  }, [onGameEnd, onReturnToBase]);

  useEffect(() => {
    inputRef.current = new InputManager();
    const canvas = canvasRef.current;
    if (canvas) {
      const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
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
      <canvas ref={canvasRef} className="block w-full h-full" style={{ imageRendering: 'auto' }} />
      <HUD {...hudState} onRestart={handleRestart} onReturnToBase={handleReturnToBase} />
    </div>
  );
};

export default GameCanvas;
