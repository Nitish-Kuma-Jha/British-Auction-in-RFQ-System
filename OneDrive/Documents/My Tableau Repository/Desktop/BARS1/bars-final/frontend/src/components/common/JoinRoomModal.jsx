import React, { useState } from 'react';
import { roomAPI } from '../../utils/api';
import toast from 'react-hot-toast';

export default function JoinRoomModal({ onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) { toast.error('Room code required'); return; }
    if (!teamName.trim()) { toast.error('Team name required'); return; }
    setLoading(true);
    try {
      const { data } = await roomAPI.join({ code: code.toUpperCase().trim(), teamName });
      toast.success('Joined room!');
      onJoined(data.room);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid room code');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div className="modal-accent" />
          <h2 className="modal-title">Join Room</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="label">Room Code</label>
            <input
              className="input"
              placeholder="e.g. F2373T"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 20, letterSpacing: 8, textAlign: 'center' }}
              maxLength={6}
            />
          </div>

          <div className="form-group">
            <label className="label">Your Team Name</label>
            <input className="input" placeholder="Mumbai Indians" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
            <button className="btn btn-outline btn-lg" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold btn-lg" onClick={handleJoin} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Join'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
