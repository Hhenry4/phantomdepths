import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';
import { PlayerProgress, RunCheckpoint } from '../game/types';

const PRIMARY_COLLECTION = 'player_saves';
const FALLBACK_COLLECTION = 'players';

function normalizeCheckpoint(raw: any): RunCheckpoint | undefined {
  if (!raw || !raw.position) return undefined;
  return {
    position: {
      x: Number(raw.position.x ?? 0),
      y: Number(raw.position.y ?? 50),
    },
    velocity: {
      x: Number(raw.velocity?.x ?? 0),
      y: Number(raw.velocity?.y ?? 0),
    },
    rotation: Number(raw.rotation ?? Math.PI / 2),
    aimAngle: Number(raw.aimAngle ?? raw.rotation ?? Math.PI / 2),
    depth: Number(raw.depth ?? Math.max(0, raw.position.y ?? 0)),
    hull: Number(raw.hull ?? 100),
    power: Number(raw.power ?? 100),
    oxygen: Number(raw.oxygen ?? 100),
    coins: Number(raw.coins ?? 0),
    xpEarned: Number(raw.xpEarned ?? 0),
    killCount: raw.killCount ?? {},
    bossesDefeated: raw.bossesDefeated ?? [],
    savedAt: Number(raw.savedAt ?? Date.now()),
  };
}

function normalizeProgress(data: any): PlayerProgress {
  return {
    coins: Number(data.coins ?? 0),
    upgrades: data.upgrades ?? {},
    deepestEver: Number(data.deepestEver ?? 0),
    totalKills: Number(data.totalKills ?? 0),
    questsCompleted: data.questsCompleted ?? [],
    unlockedZones: data.unlockedZones ?? ['sunlight'],
    xp: Number(data.xp ?? 0),
    level: Number(data.level ?? 1),
    weaponsOwned: data.weaponsOwned ?? ['harpoon'],
    equippedWeapon: data.equippedWeapon,
    runCheckpoint: normalizeCheckpoint(data.runCheckpoint),
  };
}

export async function saveProgressToCloud(userId: string, progress: PlayerProgress): Promise<void> {
  if (!userId) return;

  const payload = {
    ...progress,
    lastSaved: Date.now(),
  };

  try {
    await Promise.all([
      setDoc(doc(db, PRIMARY_COLLECTION, userId), payload, { merge: true }),
      setDoc(doc(db, FALLBACK_COLLECTION, userId), payload, { merge: true }),
    ]);
  } catch (err) {
    console.error('Cloud save failed:', err);
    throw err;
  }
}

export async function loadProgressFromCloud(userId: string): Promise<PlayerProgress | null> {
  if (!userId) return null;

  try {
    const primarySnap = await getDoc(doc(db, PRIMARY_COLLECTION, userId));
    if (primarySnap.exists()) {
      return normalizeProgress(primarySnap.data());
    }

    const fallbackSnap = await getDoc(doc(db, FALLBACK_COLLECTION, userId));
    if (fallbackSnap.exists()) {
      return normalizeProgress(fallbackSnap.data());
    }
  } catch (err) {
    console.error('Cloud load failed:', err);
  }

  return null;
}
