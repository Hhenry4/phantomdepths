import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';
import { PlayerProgress } from '../game/types';

const COLLECTION = 'player_saves';

export async function saveProgressToCloud(userId: string, progress: PlayerProgress): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTION, userId), {
      ...progress,
      lastSaved: Date.now(),
    });
  } catch (err) {
    console.error('Cloud save failed:', err);
  }
}

export async function loadProgressFromCloud(userId: string): Promise<PlayerProgress | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, userId));
    if (snap.exists()) {
      const data = snap.data();
      return {
        coins: data.coins ?? 0,
        upgrades: data.upgrades ?? {},
        deepestEver: data.deepestEver ?? 0,
        totalKills: data.totalKills ?? 0,
        questsCompleted: data.questsCompleted ?? [],
        unlockedZones: data.unlockedZones ?? ['sunlight'],
        xp: data.xp ?? 0,
        level: data.level ?? 1,
        weaponsOwned: data.weaponsOwned ?? ['harpoon'],
      };
    }
  } catch (err) {
    console.error('Cloud load failed:', err);
  }
  return null;
}
