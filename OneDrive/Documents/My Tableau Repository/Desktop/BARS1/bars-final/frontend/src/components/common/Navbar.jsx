import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function Navbar() {
  const { user, logout, isAdmin, isBuyer, isSupplier } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const navLinks = [
    { to: '/home', label: 'Auctions' },
    { to: '/rfq', label: 'RFQ' },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', height: 56, gap: 32 }}>
        {/* Logo */}
        <Link to="/home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, var(--gold) 0%, #b8860b 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 13, color: '#000', letterSpacing: 1,
          }}>B</div>
          <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3 }}>BARS</span>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: connected ? 'var(--accent-green)' : 'var(--text-muted)',
            boxShadow: connected ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
          }} />
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                textDecoration: 'none', fontSize: 13, fontWeight: 500,
                color: isActive(link.to) ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive(link.to) ? 'var(--bg-card)' : 'transparent',
                transition: 'var(--transition)',
              }}
            >{link.label}</Link>
          ))}
        </div>

        {/* Role badge */}
        {user && (
          <span style={{
            padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            background: user.role === 'admin' ? 'rgba(212,160,23,0.15)' : user.role === 'buyer' ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)',
            color: user.role === 'admin' ? 'var(--gold)' : user.role === 'buyer' ? '#60a5fa' : '#c084fc',
          }}>{user.role}</span>
        )}

        {/* User dropdown */}
        {user && (
          <div style={{ position: 'relative' }} ref={dropRef}>
            <button
              onClick={() => setDropOpen((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                background: dropOpen ? 'var(--bg-card)' : 'transparent',
                border: '1px solid', borderColor: dropOpen ? 'var(--border-hover)' : 'transparent',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'var(--gold)',
              }}>{initials}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.company || user.role}</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {dropOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: 200,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', overflow: 'hidden',
                boxShadow: 'var(--shadow-md)', animation: 'fadeIn 0.15s ease',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>
                </div>
                <div style={{ padding: 4 }}>
                  <button onClick={handleLogout} style={{
                    width: '100%', padding: '9px 12px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: 'var(--accent-red)', borderRadius: 6,
                    transition: 'var(--transition)', fontFamily: 'var(--font-body)',
                  }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.08)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >Sign out</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
