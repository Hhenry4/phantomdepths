import React, { useState } from 'react';
import { PlayerProgress, Upgrade, WeaponType, TIER_COLORS, WeaponTier } from '../types';
import { UPGRADES, WEAPON_SHOP } from '../constants';

interface ShopProps {
  progress: PlayerProgress;
  onPurchase: (upgradeId: string) => void;
  onBuyWeapon: (weaponType: WeaponType) => void;
  onBack: () => void;
}

type ShopTab = 'submarine' | 'weapons' | 'systems' | 'armory';

const TIER_LABELS: Record<WeaponTier, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
  mythic: 'MYTHIC',
};

const Shop: React.FC<ShopProps> = ({ progress, onPurchase, onBuyWeapon, onBack }) => {
  const [tab, setTab] = useState<ShopTab>('armory');

  const getUpgradeCost = (upgrade: Upgrade): number => {
    const level = progress.upgrades[upgrade.id] || 0;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
  };

  const getUpgradeLevel = (upgrade: Upgrade): number => {
    return progress.upgrades[upgrade.id] || 0;
  };

  const filteredUpgrades = UPGRADES.filter(u => u.category === (tab === 'armory' ? 'weapons' : tab));

  const tabs: { id: ShopTab; label: string; color: string }[] = [
    { id: 'armory', label: 'WEAPONS', color: '#ff4500' },
    { id: 'submarine', label: 'SUBMARINE', color: '#00bfff' },
    { id: 'weapons', label: 'COMBAT', color: '#ff8c00' },
    { id: 'systems', label: 'SYSTEMS', color: '#00ff88' },
  ];

  // Sort weapons by tier
  const tierOrder: WeaponTier[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];
  const sortedWeapons = [...WEAPON_SHOP].sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  return (
    <div className="w-full h-screen overflow-auto flex flex-col items-center py-6"
      style={{ background: 'linear-gradient(180deg, #010810 0%, #030f1a 100%)', fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-3xl mb-4 px-4">
        <button
          onClick={onBack}
          className="text-xs tracking-widest uppercase hover:opacity-80 transition-opacity px-3 py-1.5 border rounded"
          style={{ color: '#6a7a84', borderColor: '#1a2a3a' }}
        >
          ← BACK
        </button>
        <h2 className="text-xl font-bold tracking-wider" style={{ color: '#b4c5cf' }}>
          EQUIPMENT BAY
        </h2>
        <span className="text-sm font-bold" style={{ color: '#ffd700' }}>◆ {progress.coins}</span>
      </div>

      <div className="mb-3">
        <span className="text-xs tracking-widest" style={{ color: '#e0b0ff' }}>PILOT LEVEL {progress.level}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 py-1.5 text-xs tracking-widest uppercase border transition-all rounded"
            style={{
              color: tab === t.id ? t.color : '#4a5a64',
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
        <div className="grid grid-cols-2 gap-2.5 w-full max-w-3xl px-4">
          {sortedWeapons.map(weapon => {
            const owned = progress.weaponsOwned.includes(weapon.type);
            const canAfford = progress.coins >= weapon.cost;
            const isFree = weapon.cost === 0;
            const tierColor = TIER_COLORS[weapon.tier];

            return (
              <div
                key={weapon.type}
                className="p-3 border rounded-lg relative overflow-hidden"
                style={{
                  background: 'rgba(16, 20, 24, 0.8)',
                  borderColor: owned ? '#00ff8840' : `${tierColor}40`,
                }}
              >
                {/* Tier badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: tierColor, background: `${tierColor}15`, fontSize: '9px' }}>
                    {TIER_LABELS[weapon.tier]}
                  </span>
                </div>

                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-xs font-bold" style={{ color: tierColor }}>{weapon.name}</span>
                </div>
                <p className="text-xs mb-1.5" style={{ color: '#4a5a64', fontSize: '10px' }}>{weapon.description}</p>

                {weapon.special && (
                  <div className="mb-1.5">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#e0b0ff', background: '#e0b0ff10', fontSize: '9px' }}>
                      ⚡ {weapon.special}
                    </span>
                  </div>
                )}

                <div className="flex gap-3 text-xs mb-2" style={{ color: '#4a5a64', fontSize: '9px' }}>
                  <span>DMG: {weapon.damage}</span>
                  <span>AMMO: {weapon.ammo}</span>
                  <span>RATE: {weapon.fireRate}</span>
                </div>

                {owned ? (
                  <div className="w-full py-1.5 text-xs tracking-widest uppercase text-center rounded" style={{ color: '#00ff88', background: '#00ff8808' }}>
                    OWNED
                  </div>
                ) : isFree ? (
                  <div className="w-full py-1.5 text-xs tracking-widest uppercase text-center" style={{ color: '#00ff88' }}>
                    DEFAULT
                  </div>
                ) : (
                  <button
                    onClick={() => canAfford && onBuyWeapon(weapon.type)}
                    className="w-full py-1.5 text-xs tracking-widest uppercase border transition-all rounded"
                    style={{
                      color: canAfford ? '#ffd700' : '#2a3a44',
                      borderColor: canAfford ? '#ffd70040' : '#1a2a3a',
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
        <div className="grid grid-cols-2 gap-2.5 w-full max-w-3xl px-4">
          {(tab === 'weapons' ? UPGRADES.filter(u => u.category === 'weapons') : filteredUpgrades).map(upgrade => {
            const level = getUpgradeLevel(upgrade);
            const cost = getUpgradeCost(upgrade);
            const maxed = level >= upgrade.maxLevel;
            const canAfford = progress.coins >= cost;

            return (
              <div
                key={upgrade.id}
                className="p-3 border rounded-lg"
                style={{
                  background: 'rgba(16, 20, 24, 0.8)',
                  borderColor: maxed ? '#00ff8830' : canAfford ? '#00bfff30' : '#1a2a3a',
                }}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-xs font-bold" style={{ color: '#b4c5cf' }}>{upgrade.name}</span>
                  <span className="text-xs" style={{ color: maxed ? '#00ff88' : '#4a5a64', fontSize: '10px' }}>
                    {level}/{upgrade.maxLevel}
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: '#4a5a64', fontSize: '10px' }}>{upgrade.description}</p>

                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full"
                      style={{ background: i < level ? '#00bfff' : '#1a2a3a' }}
                    />
                  ))}
                </div>

                {!maxed ? (
                  <button
                    onClick={() => canAfford && onPurchase(upgrade.id)}
                    className="w-full py-1.5 text-xs tracking-widest uppercase border transition-all rounded"
                    style={{
                      color: canAfford ? '#ffd700' : '#2a3a44',
                      borderColor: canAfford ? '#ffd70040' : '#1a2a3a',
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                      opacity: canAfford ? 1 : 0.5,
                    }}
                  >
                    UPGRADE — ◆ {cost}
                  </button>
                ) : (
                  <div className="w-full py-1.5 text-xs tracking-widest uppercase text-center rounded" style={{ color: '#00ff88', background: '#00ff8808' }}>
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
