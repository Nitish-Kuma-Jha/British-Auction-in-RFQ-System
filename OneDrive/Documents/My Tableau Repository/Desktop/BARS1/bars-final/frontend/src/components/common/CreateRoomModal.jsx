import React, { useState } from 'react';
import { roomAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const PURSE_OPTIONS = [100, 150, 200, 250];
const SQUAD_OPTIONS = [11, 13, 15, 18];
const TIMER_OPTIONS = [10, 15, 20, 25, 30];
const ORDER_OPTIONS = ['random', 'byCategory'];

export default function CreateRoomModal({ type, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    teamName: '',
    isPublic: false,
    purse: 100,
    squadSize: type === 'daily' ? 8 : 15,
    timer: type === 'daily' ? 10 : 15,
    order: 'random',
    maxParticipants: 20,
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Room name is required'); return; }
    if (!form.teamName.trim()) { toast.error('Team name is required'); return; }
    setLoading(true);
    try {
      const { data } = await roomAPI.create({
        name: form.name,
        teamName: form.teamName,
        isPublic: form.isPublic,
        type: type || 'season',
        config: {
          purse: form.purse,
          squadSize: form.squadSize,
          timer: form.timer,
          order: form.order,
          maxParticipants: form.maxParticipants,
        },
      });
      toast.success('Room created!');
      onCreated(data.room);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-accent" />
          <h2 className="modal-title">{type === 'daily' ? 'Create Daily Auction Room' : 'Create Room'}</h2>
        </div>

        {type === 'daily' && (
          <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>MI <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs</span> KKR</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sun, 29 Mar</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group">
            <label className="label">Room Name</label>
            <input className="input" placeholder={type === 'daily' ? 'MI vs KKR Draft' : 'Boys IPL 2026'} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="label">Your Team Name</label>
            <input className="input" placeholder={type === 'daily' ? 'Dream XI' : 'Super Kings'} value={form.teamName} onChange={(e) => set('teamName', e.target.value)} />
          </div>

          {type !== 'daily' && (
            <div className="form-row">
              <div className="form-group">
                <label className="label">Purse (Crores)</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PURSE_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => set('purse', p)}
                      style={{
                        flex: 1, padding: '8px 4px', border: '1px solid',
                        borderColor: form.purse === p ? 'var(--gold)' : 'var(--border)',
                        borderRadius: 'var(--radius-sm)', background: form.purse === p ? 'var(--gold-bg)' : 'transparent',
                        color: form.purse === p ? 'var(--gold)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
                      }}
                    >₹{p}Cr</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="label">Squad Size</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {SQUAD_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => set('squadSize', s)}
                      style={{
                        flex: 1, padding: '8px 4px', border: '1px solid',
                        borderColor: form.squadSize === s ? 'var(--gold)' : 'var(--border)',
                        borderRadius: 'var(--radius-sm)', background: form.squadSize === s ? 'var(--gold-bg)' : 'transparent',
                        color: form.squadSize === s ? 'var(--gold)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="label">Bid Timer (seconds)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(type === 'daily' ? [10, 20, 30] : TIMER_OPTIONS).map((t) => (
                  <button
                    key={t}
                    onClick={() => set('timer', t)}
                    style={{
                      flex: 1, padding: '8px 4px', border: '1px solid',
                      borderColor: form.timer === t ? 'var(--gold)' : 'var(--border)',
                      borderRadius: 'var(--radius-sm)', background: form.timer === t ? 'var(--gold-bg)' : 'transparent',
                      color: form.timer === t ? 'var(--gold)' : 'var(--text-secondary)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
                    }}
                  >{t}s</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Seconds per bid</div>
            </div>

            {type !== 'daily' && (
              <div className="form-group">
                <label className="label">Player Order</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {ORDER_OPTIONS.map((o) => (
                    <button
                      key={o}
                      onClick={() => set('order', o)}
                      style={{
                        flex: 1, padding: '8px 4px', border: '1px solid',
                        borderColor: form.order === o ? 'var(--gold)' : 'var(--border)',
                        borderRadius: 'var(--radius-sm)', background: form.order === o ? 'var(--gold-bg)' : 'transparent',
                        color: form.order === o ? 'var(--gold)' : 'var(--text-secondary)',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
                      }}
                    >{o === 'byCategory' ? 'By Category' : 'Random'}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div
              onClick={() => set('isPublic', !form.isPublic)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: form.isPublic ? 'var(--gold)' : 'var(--bg-secondary)',
                border: '1px solid', borderColor: form.isPublic ? 'var(--gold)' : 'var(--border)',
                position: 'relative', transition: 'var(--transition)', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: form.isPublic ? 22 : 2,
                width: 18, height: 18, borderRadius: 9,
                background: form.isPublic ? '#000' : 'var(--text-muted)',
                transition: 'var(--transition)',
              }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Make this room public</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Anyone can discover and join</div>
            </div>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
            <button className="btn btn-outline btn-lg" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold btn-lg" onClick={handleCreate} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
