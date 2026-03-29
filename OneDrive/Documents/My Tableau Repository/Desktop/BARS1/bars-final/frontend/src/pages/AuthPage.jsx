import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const location = useLocation();
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('mode') === 'register' ? 'register' : 'login';
  });
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'supplier', company: '', phone: '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.email || !form.password) { toast.error('Email and password required'); return; }
    if (mode === 'register' && !form.name) { toast.error('Name required'); return; }
    setLoading(true);
    try {
      const user = mode === 'login'
        ? await login(form.email, form.password)
        : await register(form);
      toast.success(`Welcome${mode === 'register' ? ', ' + user.name : ' back'}!`);
      navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const onKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)', fontSize: 14,
    transition: 'all 0.2s', outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: 'var(--text-secondary)', letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: 7,
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg-primary)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: '0 0 44%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 56px',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative large letter */}
        <div style={{
          position: 'absolute', right: -20, bottom: -30,
          fontFamily: 'var(--font-display)', fontSize: 280,
          color: 'rgba(212,160,23,0.04)', letterSpacing: -10,
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        }}>BARS</div>

        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 64 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--gold) 0%, #b8860b 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 16, color: '#000',
          }}>B</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gold)', letterSpacing: 4 }}>BARS</span>
        </Link>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 52, letterSpacing: '0.04em',
          color: 'var(--text-primary)', lineHeight: 1, marginBottom: 20,
        }}>
          THE AUCTION<br />
          <span style={{ color: 'var(--gold)' }}>PLATFORM</span><br />
          BUILT FOR FAIR<br />TRADE.
        </h2>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, maxWidth: 340, marginBottom: 48 }}>
          British-style competitive bidding with automatic time extensions,
          live supplier rankings, and forced close protection.
        </p>

        <div style={{ display: 'flex', gap: 24 }}>
          {[['🏺', 'Antiques'], ['🎨', 'Art'], ['📚', 'Books'], ['💎', 'Jewelry']].map(([emoji, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '60px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 12,
            padding: 4, marginBottom: 36,
          }}>
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: 9,
                  background: mode === m ? 'var(--gold)' : 'transparent',
                  color: mode === m ? '#000' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', transition: 'all 0.2s',
                  letterSpacing: '0.04em',
                }}
              >{m === 'login' ? 'Sign In' : 'Create Account'}</button>
            ))}
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
            {mode === 'login' ? 'Welcome back' : 'Join BARS'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
            {mode === 'login' ? 'Sign in to your account to continue.' : 'Create your account to start bidding.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mode === 'register' && (
              <>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input style={inputStyle} placeholder="Enter your full name" value={form.name} onChange={set('name')} onKeyDown={onKey}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }} value={form.role} onChange={set('role')}>
                      <option style={{ color: 'var(--text-primary)', background: 'var(--bg-secondary)' }} value="supplier">Supplier</option>
                      <option style={{ color: 'var(--text-primary)', background: 'var(--bg-secondary)' }} value="buyer">Buyer</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Company</label>
                    <input style={inputStyle} placeholder="Company name" value={form.company} onChange={set('company')} onKeyDown={onKey}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Email Address</label>
              <input style={inputStyle} type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} onKeyDown={onKey}
                onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input style={inputStyle} type="password" placeholder="••••••••" value={form.password} onChange={set('password')} onKeyDown={onKey}
                onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '14px', background: 'var(--gold)',
                border: 'none', borderRadius: 10, color: '#000',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s', marginTop: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={(e) => { if (!loading) { e.target.style.background = 'var(--gold-light)'; e.target.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--gold)'; e.target.style.transform = 'translateY(0)'; }}
            >
              {loading ? <span className="spinner" /> : mode === 'login' ? 'Sign In to BARS' : 'Create My Account'}
            </button>
          </div>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Create one</button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Sign in</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
