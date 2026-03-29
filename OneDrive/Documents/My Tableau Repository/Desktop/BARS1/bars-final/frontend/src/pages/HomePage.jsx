import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rfqAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function HomePage() {
  const { user, isBuyer, isAdmin, isSupplier } = useAuth();
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, closed: 0, awarded: 0 });

  useEffect(() => {
    rfqAPI.list().then(({ data }) => {
      const list = data.rfqs || [];
      setRfqs(list);
      setStats({
        total: list.length,
        active: list.filter((r) => r.status === 'active').length,
        closed: list.filter((r) => r.status === 'closed' || r.status === 'force_closed').length,
        awarded: list.filter((r) => r.status === 'awarded').length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const activeRfqs = rfqs.filter((r) => r.status === 'active');
  const recentRfqs = rfqs.slice(0, 8);

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 60 }}>

      {/* Welcome header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
          Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {isSupplier
            ? 'Browse active auctions and place competitive bids.'
            : isBuyer
            ? 'Manage your RFQ auctions and track supplier bids.'
            : 'BARS admin dashboard — full system control.'}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 36 }}>
        {[
          { label: 'Total RFQs', value: stats.total, icon: '📋', color: 'var(--text-primary)' },
          { label: 'Live Auctions', value: stats.active, icon: '🔴', color: 'var(--accent-green)' },
          { label: 'Completed', value: stats.closed, icon: '✅', color: 'var(--text-secondary)' },
          { label: 'Awarded', value: stats.awarded, icon: '🏆', color: 'var(--gold)' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '20px 22px', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: s.color, letterSpacing: 1, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Main: Active auctions */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              Live Auctions
              {activeRfqs.length > 0 && (
                <span style={{
                  marginLeft: 10, padding: '2px 8px', borderRadius: 100,
                  background: 'rgba(34,197,94,0.12)', color: 'var(--accent-green)',
                  fontSize: 11, fontWeight: 700, border: '1px solid rgba(34,197,94,0.2)',
                }}>{activeRfqs.length} live</span>
              )}
            </h2>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/rfq')}>View all →</button>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : activeRfqs.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🏺</div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>No live auctions right now</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                {isBuyer || isAdmin ? 'Create an RFQ to start a new auction.' : 'Check back soon for upcoming auctions.'}
              </div>
              {(isBuyer || isAdmin) && (
                <button className="btn btn-gold" onClick={() => navigate('/rfq')}>+ Create RFQ Auction</button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeRfqs.map((rfq) => (
                <AuctionCard key={rfq._id} rfq={rfq} onClick={() => navigate(`/rfq/${rfq._id}`)} />
              ))}
            </div>
          )}

          {/* Recent (non-active) */}
          {rfqs.filter((r) => r.status !== 'active').length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Auctions</h2>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Auction</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Lowest Bid</th>
                      <th>Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqs.filter((r) => r.status !== 'active').slice(0, 6).map((rfq) => (
                      <tr key={rfq._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/rfq/${rfq._id}`)}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{rfq.rfqName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{rfq.referenceId}</div>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{rfq.item?.category || '—'}</td>
                        <td><StatusBadge status={rfq.status} /></td>
                        <td>
                          {rfq.lowestBid ? (
                            <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                              ₹{rfq.lowestBid.quote?.totalAmount?.toLocaleString()}
                            </span>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No bids</span>}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {rfq.bidCloseTime ? format(new Date(rfq.bidCloseTime), 'dd MMM, hh:mm a') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Quick actions */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-gold btn-full" onClick={() => navigate('/rfq')}>
                {(isBuyer || isAdmin) ? '+ Create RFQ Auction' : '🏷 Browse Auctions'}
              </button>
              <button className="btn btn-outline btn-full" onClick={() => navigate('/rfq')}>View All RFQs</button>
              {isAdmin && <button className="btn btn-outline btn-full" onClick={() => navigate('/admin')}>Admin Panel</button>}
            </div>
          </div>

          {/* About British Auction */}
          <div className="card" style={{ padding: 20, borderColor: 'var(--gold-border)', background: 'var(--gold-bg)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>⚡ How British Auction Works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '📥', text: 'Suppliers submit bids openly' },
                { icon: '⬇️', text: 'Lower bids beat previous ones' },
                { icon: '⏱', text: 'Late bids extend the clock' },
                { icon: '🔒', text: 'Forced close prevents runaway bids' },
              ].map((item) => (
                <div key={item.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Auction Categories</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['🎨', 'Paintings'], ['🏺', 'Antiques'], ['📚', 'Books'],
                ['🗿', 'Artifacts'], ['💎', 'Jewelry'], ['🪙', 'Coins'],
              ].map(([emoji, name]) => (
                <div key={name} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', background: 'var(--bg-secondary)',
                  borderRadius: 8, border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 16 }}>{emoji}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuctionCard({ rfq, onClick }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(rfq.currentCloseTime) - new Date();
      if (diff <= 0) { setCountdown('CLOSED'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [rfq.currentCloseTime]);

  const isUrgent = new Date(rfq.currentCloseTime) - new Date() < 10 * 60000;

  return (
    <div
      className="card"
      style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      onClick={onClick}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          flexShrink: 0,
        }}>
          {getCategoryEmoji(rfq.item?.category)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{rfq.rfqName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
            <span>{rfq.item?.category || 'Auction'}</span>
            <span>·</span>
            <span>{rfq.invitedSuppliers?.length || 0} suppliers</span>
            {rfq.extensionCount > 0 && <><span>·</span><span style={{ color: 'var(--accent-orange)' }}>{rfq.extensionCount}× extended</span></>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>L1 Bid</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--accent-green)' }}>
            {rfq.lowestBid ? `₹${rfq.lowestBid.quote?.totalAmount?.toLocaleString()}` : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Closes In</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15,
            color: isUrgent ? 'var(--accent-red)' : 'var(--gold)',
          }}>{countdown}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: 'badge-active', closed: 'badge-closed',
    force_closed: 'badge-force', draft: 'badge-draft', awarded: 'badge-gold',
  };
  return <span className={`badge ${map[status] || 'badge-draft'}`}>{status?.replace('_', ' ').toUpperCase()}</span>;
}

function getCategoryEmoji(cat) {
  const map = {
    'Paintings': '🎨', 'Antiques': '🏺', 'Books': '📚', 'Artifacts': '🗿',
    'Jewelry': '💎', 'Coins': '🪙', 'Ceramics': '🏛️', 'Sculptures': '🗽',
    'Manuscripts': '📜', 'Stamps': '📫', 'Textiles': '🧵', 'Electronics': '💻',
    'Furniture': '🪑', 'Watches': '⌚',
  };
  return map[cat] || '🏷';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
