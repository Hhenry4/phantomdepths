import React, { useState } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { createRoom, joinRoom, listRooms } from '../../firebase/multiplayer';

interface MultiplayerLobbyProps {
  onStartMultiplayer: (roomId: string) => void;
  onBack: () => void;
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onStartMultiplayer, onBack }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [password, setPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Pilot';

  const handleCreate = async () => {
    if (!user || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const roomId = await createRoom(user.uid, displayName, password.trim());
      onStartMultiplayer(roomId);
    } catch (e) {
      setError('Failed to create room');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user || !roomCode.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const success = await joinRoom(roomCode.trim(), password.trim(), user.uid, displayName);
      if (success) {
        onStartMultiplayer(roomCode.trim());
      } else {
        setError('Invalid room code or password');
      }
    } catch (e) {
      setError('Failed to join room');
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: '#010810', fontFamily: "'IBM Plex Mono', monospace" }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: '#b4c5cf' }}>Sign in with Google to play multiplayer</p>
          <button onClick={onBack} className="text-xs tracking-widest" style={{ color: '#6a7a84' }}>← BACK</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center" style={{ background: '#010810', fontFamily: "'IBM Plex Mono', monospace" }}>
      <h2 className="text-2xl font-bold tracking-wider mb-8" style={{ color: '#b4c5cf' }}>MULTIPLAYER</h2>

      {mode === 'menu' && (
        <div className="flex flex-col gap-4 w-80">
          <button
            onClick={() => setMode('create')}
            className="w-full py-4 text-sm tracking-widest uppercase border-2 hover:bg-cyan-500 hover:bg-opacity-20 transition-all"
            style={{ color: '#00bfff', borderColor: '#00bfff' }}
          >
            CREATE ROOM
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full py-4 text-sm tracking-widest uppercase border-2 hover:bg-green-500 hover:bg-opacity-20 transition-all"
            style={{ color: '#00ff88', borderColor: '#00ff88' }}
          >
            JOIN ROOM
          </button>
          <button
            onClick={onBack}
            className="w-full py-3 text-xs tracking-widest uppercase hover:opacity-80"
            style={{ color: '#6a7a84' }}
          >
            ← BACK
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="flex flex-col gap-4 w-80">
          <label className="text-xs tracking-widest" style={{ color: '#6a7a84' }}>SET ROOM PASSWORD</label>
          <input
            type="text"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password..."
            className="w-full px-4 py-3 text-sm border bg-transparent outline-none"
            style={{ color: '#b4c5cf', borderColor: '#1a2a3a', fontFamily: "'IBM Plex Mono', monospace" }}
          />
          {error && <p className="text-xs" style={{ color: '#ff4500' }}>{error}</p>}
          <button
            onClick={handleCreate}
            disabled={loading || !password.trim()}
            className="w-full py-3 text-sm tracking-widest uppercase border-2 hover:bg-cyan-500 hover:bg-opacity-20 transition-all disabled:opacity-30"
            style={{ color: '#00bfff', borderColor: '#00bfff' }}
          >
            {loading ? 'CREATING...' : 'CREATE & START'}
          </button>
          <button onClick={() => { setMode('menu'); setError(''); }} className="text-xs tracking-widest" style={{ color: '#6a7a84' }}>← BACK</button>
        </div>
      )}

      {mode === 'join' && (
        <div className="flex flex-col gap-4 w-80">
          <label className="text-xs tracking-widest" style={{ color: '#6a7a84' }}>ROOM CODE</label>
          <input
            type="text"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            placeholder="Paste room code..."
            className="w-full px-4 py-3 text-sm border bg-transparent outline-none"
            style={{ color: '#b4c5cf', borderColor: '#1a2a3a', fontFamily: "'IBM Plex Mono', monospace" }}
          />
          <label className="text-xs tracking-widest" style={{ color: '#6a7a84' }}>PASSWORD</label>
          <input
            type="text"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password..."
            className="w-full px-4 py-3 text-sm border bg-transparent outline-none"
            style={{ color: '#b4c5cf', borderColor: '#1a2a3a', fontFamily: "'IBM Plex Mono', monospace" }}
          />
          {error && <p className="text-xs" style={{ color: '#ff4500' }}>{error}</p>}
          <button
            onClick={handleJoin}
            disabled={loading || !roomCode.trim() || !password.trim()}
            className="w-full py-3 text-sm tracking-widest uppercase border-2 hover:bg-green-500 hover:bg-opacity-20 transition-all disabled:opacity-30"
            style={{ color: '#00ff88', borderColor: '#00ff88' }}
          >
            {loading ? 'JOINING...' : 'JOIN ROOM'}
          </button>
          <button onClick={() => { setMode('menu'); setError(''); }} className="text-xs tracking-widest" style={{ color: '#6a7a84' }}>← BACK</button>
        </div>
      )}
    </div>
  );
};

export default MultiplayerLobby;
