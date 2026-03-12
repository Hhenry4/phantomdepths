import { ref, set, get, onValue, remove, push, update, off } from 'firebase/database';
import { rtdb } from './config';

export interface MultiplayerRoom {
  id: string;
  hostName: string;
  hostId: string;
  password: string;
  players: Record<string, PlayerData>;
  createdAt: number;
}

export interface PlayerData {
  name: string;
  odometry: { x: number; y: number; rotation: number };
  depth: number;
  hull: number;
  maxHull: number;
  score: number;
  alive: boolean;
}

export async function createRoom(hostId: string, hostName: string, password: string): Promise<string> {
  const roomRef = push(ref(rtdb, 'rooms'));
  const roomId = roomRef.key!;
  await set(roomRef, {
    hostName,
    hostId,
    password,
    createdAt: Date.now(),
    players: {
      [hostId]: {
        name: hostName,
        odometry: { x: 0, y: 50, rotation: 0 },
        depth: 0,
        hull: 100,
        maxHull: 100,
        score: 0,
        alive: true,
      },
    },
  });
  return roomId;
}

export async function joinRoom(roomId: string, password: string, playerId: string, playerName: string): Promise<boolean> {
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return false;
  const room = snap.val();
  if (room.password !== password) return false;

  await update(ref(rtdb, `rooms/${roomId}/players/${playerId}`), {
    name: playerName,
    odometry: { x: 0, y: 50, rotation: 0 },
    depth: 0,
    hull: 100,
    maxHull: 100,
    score: 0,
    alive: true,
  });
  return true;
}

export function updatePlayerData(roomId: string, playerId: string, data: Partial<PlayerData>) {
  update(ref(rtdb, `rooms/${roomId}/players/${playerId}`), data);
}

export function subscribeToRoom(roomId: string, callback: (players: Record<string, PlayerData>) => void): () => void {
  const playersRef = ref(rtdb, `rooms/${roomId}/players`);
  const unsub = onValue(playersRef, (snap) => {
    if (snap.exists()) {
      callback(snap.val());
    }
  });
  return () => off(playersRef);
}

export async function leaveRoom(roomId: string, playerId: string) {
  await remove(ref(rtdb, `rooms/${roomId}/players/${playerId}`));
}

export async function deleteRoom(roomId: string) {
  await remove(ref(rtdb, `rooms/${roomId}`));
}

export async function listRooms(): Promise<{ id: string; hostName: string; playerCount: number }[]> {
  const snap = await get(ref(rtdb, 'rooms'));
  if (!snap.exists()) return [];
  const rooms: { id: string; hostName: string; playerCount: number }[] = [];
  snap.forEach((child) => {
    const val = child.val();
    rooms.push({
      id: child.key!,
      hostName: val.hostName,
      playerCount: Object.keys(val.players || {}).length,
    });
  });
  return rooms;
}
