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

// Sanitize data to remove undefined values (Firestore rejects them)
function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitize(value);
    }
  }
  return clean;
}

export async function saveProgressToCloud(userId: string, progress: PlayerProgress): Promise<void> {
  if (!userId) {
    console.warn('[SaveSystem] No userId, skipping save');
    return;
  }

  const payload = sanitize({
    coins: progress.coins,
    upgrades: progress.upgrades,
    deepestEver: progress.deepestEver,
    totalKills: progress.totalKills,
    questsCompleted: progress.questsCompleted,
    unlockedZones: progress.unlockedZones,
    xp: progress.xp,
    level: progress.level,
    weaponsOwned: progress.weaponsOwned,
    equippedWeapon: progress.equippedWeapon || null,
    runCheckpoint: progress.runCheckpoint ? {
      position: { x: progress.runCheckpoint.position.x, y: progress.runCheckpoint.position.y },
      velocity: { x: progress.runCheckpoint.velocity.x, y: progress.runCheckpoint.velocity.y },
      rotation: progress.runCheckpoint.rotation,
      aimAngle: progress.runCheckpoint.aimAngle,
      depth: progress.runCheckpoint.depth,
      hull: progress.runCheckpoint.hull,
      power: progress.runCheckpoint.power,
      oxygen: progress.runCheckpoint.oxygen,
      coins: progress.runCheckpoint.coins,
      xpEarned: progress.runCheckpoint.xpEarned,
      killCount: progress.runCheckpoint.killCount,
      bossesDefeated: progress.runCheckpoint.bossesDefeated,
      savedAt: progress.runCheckpoint.savedAt,
    } : null,
    lastSaved: Date.now(),
  });

  console.log('[SaveSystem] Saving to Firestore for user:', userId, 'coins:', payload.coins, 'depth:', payload.deepestEver);

  try {
    // Save to both collections for redundancy
    const primaryRef = doc(db, PRIMARY_COLLECTION, userId);
    const fallbackRef = doc(db, FALLBACK_COLLECTION, userId);
    
    await Promise.all([
      setDoc(primaryRef, payload, { merge: true }).then(() => {
        console.log('[SaveSystem] ✅ Primary save success');
      }),
      setDoc(fallbackRef, payload, { merge: true }).then(() => {
        console.log('[SaveSystem] ✅ Fallback save success');
      }),
    ]);
    
    console.log('[SaveSystem] ✅ All saves completed successfully');
  } catch (err: any) {
    console.error('[SaveSystem] ❌ Cloud save failed:', err?.message || err);
    console.error('[SaveSystem] Error code:', err?.code);
    throw err;
  }
}

export async function loadProgressFromCloud(userId: string): Promise<PlayerProgress | null> {
  if (!userId) return null;

  console.log('[SaveSystem] Loading from Firestore for user:', userId);

  try {
    const primarySnap = await getDoc(doc(db, PRIMARY_COLLECTION, userId));
    if (primarySnap.exists()) {
      console.log('[SaveSystem] ✅ Loaded from primary collection');
      return normalizeProgress(primarySnap.data());
    }

    const fallbackSnap = await getDoc(doc(db, FALLBACK_COLLECTION, userId));
    if (fallbackSnap.exists()) {
      console.log('[SaveSystem] ✅ Loaded from fallback collection');
      return normalizeProgress(fallbackSnap.data());
    }
    
    console.log('[SaveSystem] No existing save found for user');
  } catch (err: any) {
    console.error('[SaveSystem] ❌ Cloud load failed:', err?.message || err);
    console.error('[SaveSystem] Error code:', err?.code);
  }

  return null;
}
