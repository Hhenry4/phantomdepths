import React, { useRef, useEffect, useCallback, useState } from 'react';
import { InputManager } from '../engine/Input';
import { createInitialState, resetBossTracker, updateGame } from '../engine/GameLoop';
import { render } from '../engine/Renderer';
import { GameState, PlayerProgress, RunCheckpoint } from '../types';
import HUD from './HUD';
import { useAuth } from '../../firebase/AuthContext';
import { updatePlayerData, subscribeToRoom, leaveRoom } from '../../firebase/multiplayer';
import type { PlayerData } from '../../firebase/multiplayer';
import {
  resumeAudio, playHarpoonSound, playTorpedoSound, playPlasmaSound,
  playShockSound, playSonarPing, playDamageSound, playChestSound,
  playFlakSound, playCryoSound, playRailgunSound, playVortexSound,
  playReloadSound, updateEngineHum, stopEngine
} from '../engine/Audio';

interface GameCanvasProps {
  progress: PlayerProgress;
  onGameEnd: (coins: number, deepest: number, kills: number, killCount: Record<string, number>, bossesDefeated: string[], xpEarned: number) => void;
  onReturnToBase: () => void;
  multiplayerRoomId?: string | null;
  onCheckpointSave?: (checkpoint: RunCheckpoint) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ progress, onGameEnd, onReturnToBase, multiplayerRoomId, onCheckpointSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const animFrameRef = useRef<number>(0);
  const otherPlayersRef = useRef<Record<string, PlayerData>>({});
  const prevHullRef = useRef<number>(0);
  const prevCoinsRef = useRef<number>(0);
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
    prevHullRef.current = stateRef.current.sub.hull;
    prevCoinsRef.current = 0;
  }, [progress]);

  const buildCheckpoint = useCallback((state: GameState): RunCheckpoint => ({
    position: { ...state.sub.pos },
    velocity: { ...state.sub.vel },
    rotation: state.sub.rotation,
    aimAngle: state.sub.aimAngle,
    depth: state.sub.depth,
    hull: state.sub.hull,
    power: state.sub.power,
    oxygen: state.sub.oxygen,
    coins: state.coins,
    xpEarned: state.xpEarned,
    killCount: { ...state.killCount },
    bossesDefeated: [...state.bossesDefeated],
    savedAt: Date.now(),
  }), []);

  const saveCheckpoint = useCallback((state: GameState) => {
    if (!user || !onCheckpointSave) return;
    onCheckpointSave(buildCheckpoint(state));
  }, [buildCheckpoint, onCheckpointSave, user]);

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
      const wasPaused = state.paused;
      state.paused = !state.paused;
      if (!wasPaused && state.paused) {
        saveCheckpoint(state);
      }
    }

    // Resume audio on any interaction
    if (inputRef.current.mouseDown || inputRef.current.keys.size > 0) {
      resumeAudio();
    }

    if (!state.paused && !state.gameOver) {
      // Sound effects based on state changes
      const prevProj = state.projectiles.length;
      const prevSonar = state.sonarPings.length;

      updateGame(state, inputRef.current, 1, progress, canvas.width, canvas.height);

      // Weapon fire sounds
      if (state.projectiles.length > prevProj) {
        const newest = state.projectiles[state.projectiles.length - 1];
        switch (newest.type) {
          case 'harpoon': playHarpoonSound(); break;
          case 'torpedo': playTorpedoSound(); break;
          case 'plasma': playPlasmaSound(); break;
          case 'shock': playShockSound(); break;
          case 'flak': playFlakSound(); break;
          case 'cryo': playCryoSound(); break;
          case 'railgun': playRailgunSound(); break;
          case 'vortex': playVortexSound(); break;
        }
      }

      // Sonar sound
      if (state.sonarPings.length > prevSonar) {
        playSonarPing();
      }

      // Damage sound
      if (state.sub.hull < prevHullRef.current - 3) {
        playDamageSound();
      }
      prevHullRef.current = state.sub.hull;

      // Chest sound
      if (state.coins > prevCoinsRef.current + 5) {
        playChestSound();
      }
      prevCoinsRef.current = state.coins;

      // Engine hum
      updateEngineHum(state.sub.engineNoise);

      // Reload sound
      if (inputRef.current.wasPressed('r')) {
        playReloadSound();
      }
    } else {
      inputRef.current.clearFrame();
    }

    // Send multiplayer update every 2 frames for smoother sync
    if (multiplayerRoomId && user && state.time % 2 === 0) {
      updatePlayerData(multiplayerRoomId, user.uid, {
        name: user.displayName || user.email?.split('@')[0] || 'Pilot',
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

    if (!state.paused && !state.gameOver && state.time % 600 === 0) {
      saveCheckpoint(state);
    }

    if (state.time % 3 === 0 || state.gameOver || state.paused) {
      updateHud(state);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [updateHud, multiplayerRoomId, user, progress, saveCheckpoint]);

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
    stopEngine();
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
        if (stateRef.current && !stateRef.current.gameOver) {
          saveCheckpoint(stateRef.current);
        }
        inputRef.current?.destroy();
        stopEngine();
      };
    }
  }, [gameLoop]);

  // Checkpoints are written on pause, periodic intervals, and unmount.

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#010810', cursor: 'crosshair' }}>
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
