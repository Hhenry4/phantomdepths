import React from 'react';
import { PlayerProgress, Upgrade } from '../types';
import { UPGRADES } from '../constants';

interface ShopProps {
  progress: PlayerProgress;
  onPurchase: (upgradeId: string) => void;
  onBack: () => void;
}

const Shop: React.FC<ShopProps> = ({ progress, onPurchase, onBack }) => {
  const getUpgradeCost = (upgrade: Upgrade): number => {
    const level = progress.upgrades[upgrade.id] || 0;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
  };

  const getUpgradeLevel = (upgrade: Upgrade): number => {
    return progress.upgrades[upgrade.id] || 0;
  };

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{ background: '#010810', fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-2xl mb-8 px-4">
        <button
          onClick={onBack}
          className="text-sm tracking-widest uppercase hover:opacity-80 transition-opacity"
          style={{ color: '#6a7a84' }}
        >
          ← BACK
        </button>
        <h2 className="text-2xl font-bold tracking-wider" style={{ color: '#b4c5cf' }}>
          SUBMARINE UPGRADES
        </h2>
        <span className="text-lg font-bold" style={{ color: '#ffd700' }}>◆ {progress.coins}</span>
      </div>

      {/* Upgrade Grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-2xl px-4">
        {UPGRADES.map(upgrade => {
          const level = getUpgradeLevel(upgrade);
          const cost = getUpgradeCost(upgrade);
          const maxed = level >= upgrade.maxLevel;
          const canAfford = progress.coins >= cost;

          return (
            <div
              key={upgrade.id}
              className="p-4 border"
              style={{
                background: 'rgba(16, 20, 24, 0.8)',
                borderColor: maxed ? '#00ff88' : canAfford ? '#00bfff' : '#1a2a3a',
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold" style={{ color: '#b4c5cf' }}>{upgrade.name}</span>
                <span className="text-xs" style={{ color: maxed ? '#00ff88' : '#6a7a84' }}>
                  LV {level}/{upgrade.maxLevel}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: '#4a5a64' }}>{upgrade.description}</p>

              {/* Level pips */}
              <div className="flex gap-1 mb-3">
                {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1"
                    style={{ background: i < level ? '#00bfff' : '#1a2a3a' }}
                  />
                ))}
              </div>

              {!maxed ? (
                <button
                  onClick={() => canAfford && onPurchase(upgrade.id)}
                  className="w-full py-2 text-xs tracking-widest uppercase border transition-all"
                  style={{
                    color: canAfford ? '#ffd700' : '#3a4a54',
                    borderColor: canAfford ? '#ffd700' : '#1a2a3a',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    opacity: canAfford ? 1 : 0.5,
                  }}
                >
                  UPGRADE — ◆ {cost}
                </button>
              ) : (
                <div className="w-full py-2 text-xs tracking-widest uppercase text-center" style={{ color: '#00ff88' }}>
                  MAXED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Shop;
