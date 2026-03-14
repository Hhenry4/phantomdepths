import { supabase } from '@/integrations/supabase/client';
import { PlayerProgress, RunCheckpoint } from '../game/types';

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

function sanitize(value: any): any {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v !== undefined) out[k] = sanitize(v);
  }
  return out;
}

export async function saveProgressToCloud(userId: string, progress: PlayerProgress): Promise<void> {
  if (!userId) return;

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
    equippedWeapon: progress.equippedWeapon ?? null,
    runCheckpoint: progress.runCheckpoint
      ? {
          position: { ...progress.runCheckpoint.position },
          velocity: { ...progress.runCheckpoint.velocity },
          rotation: progress.runCheckpoint.rotation,
          aimAngle: progress.runCheckpoint.aimAngle,
          depth: progress.runCheckpoint.depth,
          hull: progress.runCheckpoint.hull,
          power: progress.runCheckpoint.power,
          oxygen: progress.runCheckpoint.oxygen,
          coins: progress.runCheckpoint.coins,
          xpEarned: progress.runCheckpoint.xpEarned,
          killCount: { ...progress.runCheckpoint.killCount },
          bossesDefeated: [...progress.runCheckpoint.bossesDefeated],
          savedAt: progress.runCheckpoint.savedAt,
        }
      : null,
    lastSaved: Date.now(),
  });

  const { error } = await supabase.rpc('save_player_progress', {
    p_firebase_uid: userId,
    p_progress: payload,
  });

  if (error) {
    console.error('[SaveSystem] Supabase save failed:', error.message);
    throw error;
  }
}

export async function loadProgressFromCloud(userId: string): Promise<PlayerProgress | null> {
  if (!userId) return null;

  const { data, error } = await supabase.rpc('load_player_progress', {
    p_firebase_uid: userId,
  });

  if (error) {
    console.error('[SaveSystem] Supabase load failed:', error.message);
    return null;
  }

  if (!data) return null;

  return normalizeProgress(data);
}
