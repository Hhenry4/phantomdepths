import React, { useRef, useEffect, useCallback, useState } from 'react';
import { InputManager } from '../engine/Input';
import { createInitialState, resetBossTracker, updateGame } from '../engine/GameLoop';
import { render } from '../engine/Renderer';
import { GameState, PlayerProgress } from '../types';
import HUD from './HUD';
import { useAuth } from '../../firebase/AuthContext';
import { updatePlayerData, subscribeToRoom, leaveRoom } from '../../firebase/multiplayer';
import type { PlayerData } from '../../firebase/multiplayer';

interface GameCanvasProps {
  progress: PlayerProgress;
  onGameEnd: (coins: number, deepest: number, kills: number, killCount: Record<string, number>, bossesDefeated: string[], xpEarned: number) => void;
  onReturnToBase: () => void;
  multiplayerRoomId?: string | null;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ progress, onGameEnd, onReturnToBase, multiplayerRoomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const animFrameRef = useRef<number>(0);
  const otherPlayersRef = useRef<Record<string, PlayerData>>({});
  const { user } = useAuth();

  const [hudState, setHudState] = useState({
    depth: 0, hull: 100, maxHull: 100, power: 100, maxPower: 100,
    oxygen: 100, maxOxygen: 100, zone: 'Sunlight Zone',
    engineNoise: 0, lightOn: true, sonarReady: true,
    ammo: 20, maxAmmo: 20, deepest: 0, score: 0, coins: 0,
    gameOver: false, paused: false, killCount: {} as Record<string, number>,
    activeWeapon: 'harpoon' as string,
    weaponCount: 1,
    xpEarned: 0,
  });

  const initGame = useCallback(() => {
    resetBossTracker();
    stateRef.current = createInitialState(progress);
  }, [progress]);

  useEffect(() => { initGame(); }, [initGame]);

  // Multiplayer subscription
  useEffect(() => {
    if (!multiplayerRoomId || !user) return;
    const unsub = subscribeToRoom(multiplayerRoomId, (players) => {
      const others = { ...players };
      delete others[user.uid];
      otherPlayersRef.current = others;
    });
    return () => {
      unsub();
      if (user) leaveRoom(multiplayerRoomId, user.uid);
    };
  }, [multiplayerRoomId, user]);

  const updateHud = useCallback((state: GameState) => {
    const zoneNames: Record<string, string> = {
      sunlight: 'Sunlight Zone', twilight: 'Twilight Zone',
      midnight: 'Midnight Zone', abyssal: 'Abyssal Plains', hadal: 'Hadal Trench',
    };
    const activeW = state.sub.weapons[state.sub.activeWeaponIndex];
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
      ammo: activeW?.ammo ?? 0,
      maxAmmo: activeW?.maxAmmo ?? 20,
      deepest: Math.floor(state.deepestDepth),
      score: state.score,
      coins: state.coins,
      gameOver: state.gameOver,
      paused: state.paused,
      killCount: { ...state.killCount },
      activeWeapon: activeW?.type ?? 'harpoon',
      weaponCount: state.sub.weapons.length,
      xpEarned: state.xpEarned,
    });
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const state = stateRef.current;
    if (!canvas || !ctx || !inputRef.current || !state) return;

    if (inputRef.current.wasPressed('Escape')) {
      state.paused = !state.paused;
    }

    if (!state.paused && !state.gameOver) {
      updateGame(state, inputRef.current, 1, progress);
    } else {
      inputRef.current.clearFrame();
    }

    // Send multiplayer update
    if (multiplayerRoomId && user && state.time % 5 === 0) {
      updatePlayerData(multiplayerRoomId, user.uid, {
        odometry: { x: state.sub.pos.x, y: state.sub.pos.y, rotation: state.sub.rotation },
        depth: Math.floor(state.sub.depth),
        hull: Math.floor(state.sub.hull),
        maxHull: state.sub.maxHull,
        score: state.score,
        alive: !state.gameOver,
      });
    }

    const lightLevel = progress.upgrades.light || 0;
    render(ctx, state, canvas.width, canvas.height, otherPlayersRef.current, lightLevel);

    if (state.time % 3 === 0 || state.gameOver || state.paused) {
      updateHud(state);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [updateHud, multiplayerRoomId, user, progress]);

  const endGame = useCallback((state: GameState) => {
    const totalKills = Object.values(state.killCount).reduce((a, b) => a + b, 0);
    onGameEnd(state.coins, state.deepestDepth, totalKills, state.killCount, state.bossesDefeated, state.xpEarned);
  }, [onGameEnd]);

  const handleRestart = useCallback(() => {
    const state = stateRef.current;
    if (state) endGame(state);
    initGame();
  }, [initGame, endGame]);

  const handleReturnToBase = useCallback(() => {
    const state = stateRef.current;
    if (state) endGame(state);
    onReturnToBase();
  }, [endGame, onReturnToBase]);

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

  // Auto-save on pause
  useEffect(() => {
    if (hudState.paused && stateRef.current) {
      endGame(stateRef.current);
    }
  }, [hudState.paused, endGame]);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#010810' }}>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ imageRendering: 'auto' }} />
      <HUD
        {...hudState}
        onRestart={handleRestart}
        onReturnToBase={handleReturnToBase}
      />
    </div>
  );
};

export default GameCanvas;
