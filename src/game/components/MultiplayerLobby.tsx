import React, { useState } from 'react';
import { useAuth } from '../../firebase/AuthContext';
import { createRoom, joinRoom } from '../../firebase/multiplayer';

interface MultiplayerLobbyProps {
  onStartMultiplayer: (roomId: string) => void;
  onBack: () => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onStartMultiplayer, onBack }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Pilot';

  const handleCreate = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      let roomId: string | null = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = generateRoomCode();
        try {
          roomId = await createRoom(user.uid, displayName, code);
          break;
        } catch {
          // try another code if collision
        }
      }

      if (!roomId) {
        throw new Error('Could not generate unique room code');
      }

      setGeneratedCode(roomId);
      setCreatedRoomId(roomId);
    } catch (e) {
      setError('Failed to create room');
    }

    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user || !roomCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const success = await joinRoom(roomCode.trim().toUpperCase(), user.uid, displayName);
      if (success) {
        onStartMultiplayer(roomCode.trim().toUpperCase());
      } else {
        setError('Invalid room code');
      }
    } catch (e) {
      setError('Failed to join room');
    }
    setLoading(false);
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy code');
    }
  };

  if (!user) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: '#010810', fontFamily: "'IBM Plex Mono', monospace" }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: '#b4c5cf' }}>Sign in to play multiplayer</p>
          <button onClick={onBack} className="text-xs tracking-widest px-3 py-1.5 border rounded" style={{ color: '#6a7a84', borderColor: '#1a2a3a' }}>← BACK</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #010810 0%, #030f1a 100%)', fontFamily: "'IBM Plex Mono', monospace" }}>
      <h2 className="text-xl font-bold tracking-wider mb-6" style={{ color: '#b4c5cf' }}>MULTIPLAYER</h2>

      {mode === 'menu' && (
        <div className="flex flex-col gap-3 w-72">
          <button
            onClick={() => setMode('create')}
            className="w-full py-3 text-xs tracking-widest uppercase border-2 hover:bg-cyan-500/10 transition-all rounded-lg"
            style={{ color: '#00bfff', borderColor: '#00bfff' }}
          >
            CREATE ROOM
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full py-3 text-xs tracking-widest uppercase border-2 hover:bg-green-500/10 transition-all rounded-lg"
            style={{ color: '#00ff88', borderColor: '#00ff88' }}
          >
            JOIN ROOM
          </button>
          <button
            onClick={onBack}
            className="w-full py-2 text-xs tracking-widest uppercase hover:opacity-80 border rounded"
            style={{ color: '#4a5a64', borderColor: '#1a2a3a' }}
          >
            ← BACK
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="flex flex-col gap-3 w-72">
          <p className="text-xs" style={{ color: '#4a5a64' }}>A room code will be auto-generated. Share it with friends.</p>
          {generatedCode && (
            <div className="p-3 border rounded text-center" style={{ borderColor: '#00bfff', background: '#00bfff08' }}>
              <span className="text-xs" style={{ color: '#4a5a64' }}>ROOM CODE:</span>
              <p className="text-2xl font-bold tracking-widest mt-1" style={{ color: '#00bfff' }}>{generatedCode}</p>
            </div>
          )}
          {error && <p className="text-xs" style={{ color: '#ff4500' }}>{error}</p>}
          {!generatedCode ? (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-2.5 text-xs tracking-widest uppercase border-2 hover:bg-cyan-500/10 transition-all disabled:opacity-30 rounded-lg"
              style={{ color: '#00bfff', borderColor: '#00bfff' }}
            >
              {loading ? 'CREATING...' : 'CREATE ROOM'}
            </button>
          ) : (
            <>
              <button
                onClick={handleCopyCode}
                className="w-full py-2 text-xs tracking-widest uppercase border rounded"
                style={{ color: '#b4c5cf', borderColor: '#2a3a4a' }}
              >
                {copied ? 'COPIED!' : 'COPY CODE'}
              </button>
              <button
                onClick={() => createdRoomId && onStartMultiplayer(createdRoomId)}
                className="w-full py-2.5 text-xs tracking-widest uppercase border-2 hover:bg-cyan-500/10 transition-all rounded-lg"
                style={{ color: '#00bfff', borderColor: '#00bfff' }}
              >
                START MISSION
              </button>
            </>
          )}
          <button
            onClick={() => {
              setMode('menu');
              setError('');
              setGeneratedCode('');
              setCreatedRoomId(null);
              setCopied(false);
            }}
            className="text-xs tracking-widest px-3 py-1.5 border rounded"
            style={{ color: '#4a5a64', borderColor: '#1a2a3a' }}
          >
            ← BACK
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="flex flex-col gap-3 w-72">
          <label className="text-xs tracking-widest" style={{ color: '#4a5a64' }}>ENTER ROOM CODE</label>
          <input
            type="text"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. AB3XK9"
            maxLength={6}
            className="w-full px-3 py-2.5 text-lg text-center border bg-transparent outline-none tracking-[0.3em] uppercase rounded"
            style={{ color: '#b4c5cf', borderColor: '#1a2a3a', fontFamily: "'IBM Plex Mono', monospace" }}
          />
          {error && <p className="text-xs" style={{ color: '#ff4500' }}>{error}</p>}
          <button
            onClick={handleJoin}
            disabled={loading || roomCode.trim().length < 4}
            className="w-full py-2.5 text-xs tracking-widest uppercase border-2 hover:bg-green-500/10 transition-all disabled:opacity-30 rounded-lg"
            style={{ color: '#00ff88', borderColor: '#00ff88' }}
          >
            {loading ? 'JOINING...' : 'JOIN ROOM'}
          </button>
          <button onClick={() => { setMode('menu'); setError(''); }} className="text-xs tracking-widest px-3 py-1.5 border rounded" style={{ color: '#4a5a64', borderColor: '#1a2a3a' }}>← BACK</button>
        </div>
      )}
    </div>
  );
};

export default MultiplayerLobby;
