import React, { useState } from 'react';
import { PlayerProgress, Upgrade, WeaponType } from '../types';
import { UPGRADES, WEAPON_SHOP } from '../constants';

interface ShopProps {
  progress: PlayerProgress;
  onPurchase: (upgradeId: string) => void;
  onBuyWeapon: (weaponType: WeaponType) => void;
  onBack: () => void;
}

type ShopTab = 'submarine' | 'weapons' | 'systems' | 'armory';

const Shop: React.FC<ShopProps> = ({ progress, onPurchase, onBuyWeapon, onBack }) => {
  const [tab, setTab] = useState<ShopTab>('submarine');

  const getUpgradeCost = (upgrade: Upgrade): number => {
    const level = progress.upgrades[upgrade.id] || 0;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
  };

  const getUpgradeLevel = (upgrade: Upgrade): number => {
    return progress.upgrades[upgrade.id] || 0;
  };

  const filteredUpgrades = UPGRADES.filter(u => u.category === (tab === 'armory' ? 'weapons' : tab));

  const tabs: { id: ShopTab; label: string; color: string }[] = [
    { id: 'submarine', label: 'SUBMARINE', color: '#00bfff' },
    { id: 'weapons', label: 'UPGRADES', color: '#ff8c00' },
    { id: 'armory', label: 'BUY WEAPONS', color: '#ff4500' },
    { id: 'systems', label: 'SYSTEMS', color: '#00ff88' },
  ];

  return (
    <div className="w-full h-screen overflow-auto flex flex-col items-center py-8"
      style={{ background: '#010810', fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-3xl mb-6 px-4">
        <button
          onClick={onBack}
          className="text-sm tracking-widest uppercase hover:opacity-80 transition-opacity"
          style={{ color: '#6a7a84' }}
        >
          ← BACK
        </button>
        <h2 className="text-2xl font-bold tracking-wider" style={{ color: '#b4c5cf' }}>
          EQUIPMENT BAY
        </h2>
        <span className="text-lg font-bold" style={{ color: '#ffd700' }}>◆ {progress.coins}</span>
      </div>

      {/* Level */}
      <div className="mb-4">
        <span className="text-xs tracking-widest" style={{ color: '#e0b0ff' }}>PILOT LEVEL {progress.level}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 text-xs tracking-widest uppercase border transition-all"
            style={{
              color: tab === t.id ? t.color : '#6a7a84',
              borderColor: tab === t.id ? t.color : '#1a2a3a',
              background: tab === t.id ? `${t.color}10` : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Weapon Shop */}
      {tab === 'armory' ? (
        <div className="grid grid-cols-2 gap-3 w-full max-w-3xl px-4">
          {WEAPON_SHOP.map(weapon => {
            const owned = progress.weaponsOwned.includes(weapon.type);
            const canAfford = progress.coins >= weapon.cost;
            const isFree = weapon.cost === 0;

            return (
              <div
                key={weapon.type}
                className="p-4 border"
                style={{
                  background: 'rgba(16, 20, 24, 0.8)',
                  borderColor: owned ? '#00ff88' : canAfford ? '#ff4500' : '#1a2a3a',
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold" style={{ color: '#b4c5cf' }}>{weapon.name}</span>
                  {owned && <span className="text-xs" style={{ color: '#00ff88' }}>OWNED</span>}
                </div>
                <p className="text-xs mb-2" style={{ color: '#4a5a64' }}>{weapon.description}</p>
                <div className="flex gap-4 text-xs mb-3" style={{ color: '#6a7a84' }}>
                  <span>DMG: {weapon.damage}</span>
                  <span>AMMO: {weapon.ammo}</span>
                  <span>RATE: {weapon.fireRate}</span>
                </div>

                {owned ? (
                  <div className="w-full py-2 text-xs tracking-widest uppercase text-center" style={{ color: '#00ff88' }}>
                    EQUIPPED
                  </div>
                ) : isFree ? (
                  <div className="w-full py-2 text-xs tracking-widest uppercase text-center" style={{ color: '#00ff88' }}>
                    DEFAULT
                  </div>
                ) : (
                  <button
                    onClick={() => canAfford && onBuyWeapon(weapon.type)}
                    className="w-full py-2 text-xs tracking-widest uppercase border transition-all"
                    style={{
                      color: canAfford ? '#ffd700' : '#3a4a54',
                      borderColor: canAfford ? '#ffd700' : '#1a2a3a',
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                      opacity: canAfford ? 1 : 0.5,
                    }}
                  >
                    BUY — ◆ {weapon.cost}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Upgrade Grid */
        <div className="grid grid-cols-2 gap-3 w-full max-w-3xl px-4">
          {(tab === 'weapons' ? UPGRADES.filter(u => u.category === 'weapons') : filteredUpgrades).map(upgrade => {
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
      )}
    </div>
  );
};

export default Shop;
