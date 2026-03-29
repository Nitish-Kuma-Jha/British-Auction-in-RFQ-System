import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, u, r] = await Promise.all([adminAPI.getStats(), adminAPI.getUsers(), adminAPI.getAllRFQs()]);
        setStats(s.data.stats);
        setUsers(u.data.users || []);
        setRfqs(r.data.rfqs || []);
      } catch (e) { toast.error('Failed to load admin data'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const toggleUserActive = async (userId, current) => {
    try {
      await adminAPI.updateUser(userId, { isActive: !current });
      setUsers((us) => us.map((u) => u._id === userId ? { ...u, isActive: !current } : u));
      toast.success('User updated');
    } catch { toast.error('Failed to update user'); }
  };

  const updateRole = async (userId, role) => {
    try {
      await adminAPI.updateUser(userId, { role });
      setUsers((us) => us.map((u) => u._id === userId ? { ...u, role } : u));
      toast.success('Role updated');
    } catch { toast.error('Failed to update role'); }
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div className="page-container" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>System overview and management</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid-3" style={{ marginBottom: 28 }}>
          {[
            { label: 'Total Users', value: stats.users, sub: 'Registered accounts' },
            { label: 'Total RFQs', value: stats.rfqs, sub: `${stats.activeRFQs} active` },
            { label: 'Total Rooms', value: stats.rooms, sub: `${stats.activeRooms} active` },
            { label: 'Total Bids', value: stats.bids, sub: 'All time' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 36, fontFamily: 'var(--font-display)', color: 'var(--gold)', letterSpacing: 1 }}>{s.value}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, gap: 4 }}>
        {['overview', 'users', 'rfqs'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', letterSpacing: '0.04em', transition: 'var(--transition)' }}>
            {t === 'users' ? `Users (${users.length})` : t === 'rfqs' ? `RFQs (${rfqs.length})` : 'Overview'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td>
                      <select value={u.role} onChange={(e) => updateRole(u._id, e.target.value)}
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' }}>
                        <option value="admin">Admin</option>
                        <option value="buyer">Buyer</option>
                        <option value="supplier">Supplier</option>
                      </select>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.company || '—'}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-active' : 'badge-closed'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-outline'}`} onClick={() => toggleUserActive(u._id, u.isActive)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'rfqs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>RFQ</th>
                  <th>Buyer</th>
                  <th>Status</th>
                  <th>Extensions</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{rfq.rfqName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{rfq.referenceId}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{rfq.buyer?.name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rfq.buyer?.company}</div></td>
                    <td><span className={`badge ${rfq.status === 'active' ? 'badge-active' : rfq.status === 'closed' ? 'badge-closed' : 'badge-draft'}`}>{rfq.status?.replace('_', ' ')}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>{rfq.extensionCount || 0}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(rfq.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--gold)' }}>Recent Users</div>
            {users.slice(0, 8).map((u) => (
              <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
                <span className={`tag tag-${u.role}`}>{u.role}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--gold)' }}>Recent RFQs</div>
            {rfqs.slice(0, 8).map((rfq) => (
              <div key={rfq._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{rfq.rfqName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rfq.buyer?.name}</div>
                </div>
                <span className={`badge ${rfq.status === 'active' ? 'badge-active' : 'badge-closed'}`}>{rfq.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
