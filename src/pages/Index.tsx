import React, { useState, useCallback } from 'react';
import { GameScreen, PlayerProgress } from '../game/types';
import { QUESTS } from '../game/constants';
import GameCanvas from '../game/components/GameCanvas';
import HomeScreen from '../game/components/HomeScreen';
import Shop from '../game/components/Shop';

const STORAGE_KEY = 'phantom_depths_progress';

function loadProgress(): PlayerProgress {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return {
    coins: 0,
    upgrades: {},
    deepestEver: 0,
    totalKills: 0,
    questsCompleted: [],
    unlockedZones: ['sunlight'],
  };
}

function saveProgress(progress: PlayerProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

const Index: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('home');
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);

  const handleGameEnd = useCallback((coins: number, deepest: number, kills: number, killCount: Record<string, number>, bossesDefeated: string[]) => {
    setProgress(prev => {
      const next = {
        ...prev,
        coins: prev.coins + coins,
        deepestEver: Math.max(prev.deepestEver, deepest),
        totalKills: prev.totalKills + kills,
      };

      // Check quest completion
      for (const quest of QUESTS) {
        if (next.questsCompleted.includes(quest.id)) continue;
        let completed = false;
        switch (quest.type) {
          case 'depth':
            completed = next.deepestEver >= quest.target;
            break;
          case 'kill':
            if (quest.creatureType) {
              completed = (killCount[quest.creatureType] || 0) >= quest.target;
            }
            break;
          case 'boss':
            if (quest.zone) {
              completed = bossesDefeated.includes(`${quest.zone}_boss`);
            }
            break;
        }
        if (completed) {
          next.questsCompleted.push(quest.id);
          next.coins += quest.reward;
        }
      }

      saveProgress(next);
      return next;
    });
  }, []);

  const handlePurchase = useCallback((upgradeId: string) => {
    setProgress(prev => {
      const level = prev.upgrades[upgradeId] || 0;
      const upgrade = (require('../game/constants') as any).UPGRADES.find((u: any) => u.id === upgradeId);
      if (!upgrade || level >= upgrade.maxLevel) return prev;
      const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
      if (prev.coins < cost) return prev;

      const next = {
        ...prev,
        coins: prev.coins - cost,
        upgrades: { ...prev.upgrades, [upgradeId]: level + 1 },
      };
      saveProgress(next);
      return next;
    });
  }, []);

  switch (screen) {
    case 'home':
      return (
        <HomeScreen
          progress={progress}
          onLaunchDive={() => setScreen('game')}
          onOpenShop={() => setScreen('shop')}
        />
      );
    case 'shop':
      return (
        <Shop
          progress={progress}
          onPurchase={handlePurchase}
          onBack={() => setScreen('home')}
        />
      );
    case 'game':
      return (
        <GameCanvas
          progress={progress}
          onGameEnd={handleGameEnd}
          onReturnToBase={() => setScreen('home')}
        />
      );
  }
};

export default Index;
