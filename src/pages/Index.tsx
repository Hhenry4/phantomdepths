import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameScreen, PlayerProgress, RunCheckpoint, WeaponType, getLevelFromXp } from '../game/types';
import { QUESTS, UPGRADES, WEAPON_SHOP } from '../game/constants';
import GameCanvas from '../game/components/GameCanvas';
import HomeScreen from '../game/components/HomeScreen';
import Shop from '../game/components/Shop';
import MultiplayerLobby from '../game/components/MultiplayerLobby';
import Tutorial from '../game/components/Tutorial';
import { useAuth } from '../firebase/AuthContext';
import { saveProgressToCloud, loadProgressFromCloud } from '../firebase/saveSystem';

function defaultProgress(): PlayerProgress {
  return {
    coins: 0,
    upgrades: {},
    deepestEver: 0,
    totalKills: 0,
    questsCompleted: [],
    unlockedZones: ['sunlight'],
    xp: 0,
    level: 1,
    weaponsOwned: ['harpoon'],
    runCheckpoint: undefined,
  };
}

const Index: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('home');
  const [progress, setProgress] = useState<PlayerProgress>(defaultProgress);
  const [showTutorial, setShowTutorial] = useState(false);
  const [multiplayerRoomId, setMultiplayerRoomId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  // Load from Firestore on login
  useEffect(() => {
    if (user && !loaded) {
      loadProgressFromCloud(user.uid).then(cloudProgress => {
        if (cloudProgress) {
          setProgress({ ...defaultProgress(), ...cloudProgress });
        } else {
          // First time - show tutorial
          setShowTutorial(true);
        }
        setLoaded(true);
      }).catch(() => setLoaded(true));
    } else if (!user) {
      setLoaded(false);
      setProgress(defaultProgress());
    }
  }, [user, loaded]);

  const persistProgress = useCallback((next: PlayerProgress) => {
    if (!user) return;
    saveProgressToCloud(user.uid, next).catch((err) => {
      console.error('Persist failed:', err);
    });
  }, [user]);

  const handleGameEnd = useCallback((coins: number, deepest: number, kills: number, killCount: Record<string, number>, bossesDefeated: string[], xpEarned: number) => {
    setProgress(prev => {
      const next = {
        ...prev,
        coins: prev.coins + coins,
        deepestEver: Math.max(prev.deepestEver, deepest),
        totalKills: prev.totalKills + kills,
        xp: prev.xp + xpEarned,
        level: getLevelFromXp(prev.xp + xpEarned),
        runCheckpoint: undefined,
      };

      // Quest checks
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
            } else {
              completed = next.totalKills >= quest.target;
            }
            break;
          case 'boss':
            if (quest.zone) {
              completed = bossesDefeated.includes(`${quest.zone}_boss`);
            }
            break;
          case 'level':
            completed = next.level >= quest.target;
            break;
        }
        if (completed) {
          next.questsCompleted = [...next.questsCompleted, quest.id];
          next.coins += quest.reward;
          next.xp += quest.xpReward;
          next.level = getLevelFromXp(next.xp);
        }
      }

      persistProgress(next);
      return next;
    });
  }, [persistProgress]);

  const handlePurchase = useCallback((upgradeId: string) => {
    setProgress(prev => {
      const level = prev.upgrades[upgradeId] || 0;
      const upgrade = UPGRADES.find((u) => u.id === upgradeId);
      if (!upgrade || level >= upgrade.maxLevel) return prev;
      const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
      if (prev.coins < cost) return prev;

      const next = {
        ...prev,
        coins: prev.coins - cost,
        upgrades: { ...prev.upgrades, [upgradeId]: level + 1 },
      };
      persistProgress(next);
      return next;
    });
  }, [persistProgress]);

  const handleBuyWeapon = useCallback((weaponType: WeaponType) => {
    setProgress(prev => {
      if (prev.weaponsOwned.includes(weaponType)) return prev;
      const shopItem = WEAPON_SHOP.find(w => w.type === weaponType);
      if (!shopItem || prev.coins < shopItem.cost) return prev;

      const next = {
        ...prev,
        coins: prev.coins - shopItem.cost,
        weaponsOwned: [...prev.weaponsOwned, weaponType],
      };
      persistProgress(next);
      return next;
    });
  }, [persistProgress]);

  const handleCheckpointSave = useCallback((checkpoint: RunCheckpoint) => {
    setProgress((prev) => {
      const next = {
        ...prev,
        runCheckpoint: checkpoint,
      };
      persistProgress(next);
      return next;
    });
  }, [persistProgress]);

  const handleTutorialDone = useCallback(() => {
    setShowTutorial(false);
  }, []);

  if (showTutorial) {
    return <Tutorial onComplete={handleTutorialDone} />;
  }

  switch (screen) {
    case 'home':
      return (
        <HomeScreen
          progress={progress}
          onLaunchDive={() => setScreen('game')}
          onOpenShop={() => setScreen('shop')}
          onMultiplayer={() => setScreen('multiplayer')}
        />
      );
    case 'shop':
      return (
        <Shop
          progress={progress}
          onPurchase={handlePurchase}
          onBuyWeapon={handleBuyWeapon}
          onBack={() => setScreen('home')}
        />
      );
    case 'multiplayer':
      return (
        <MultiplayerLobby
          onStartMultiplayer={(roomId) => {
            setMultiplayerRoomId(roomId);
            setScreen('game');
          }}
          onBack={() => setScreen('home')}
        />
      );
    case 'game':
      return (
        <GameCanvas
          progress={progress}
          onGameEnd={handleGameEnd}
          onReturnToBase={() => {
            setMultiplayerRoomId(null);
            setScreen('home');
          }}
          multiplayerRoomId={multiplayerRoomId}
          onCheckpointSave={handleCheckpointSave}
        />
      );
  }
};

export default Index;
