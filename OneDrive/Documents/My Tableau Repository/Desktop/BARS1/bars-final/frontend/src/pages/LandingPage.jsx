import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    const iv = setInterval(() => setTick((x) => x + 1), 1000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const features = [
    {
      icon: '⚡',
      title: 'British Auction Engine',
      desc: 'Automatic bid-time extensions, trigger windows, and forced close rules — all configurable per auction.',
    },
    {
      icon: '📊',
      title: 'Live Rank Tracking',
      desc: 'Real-time L1/L2/L3 supplier rankings update instantly as bids come in. No refresh needed.',
    },
    {
      icon: '🔒',
      title: 'Forced Close Protection',
      desc: 'Auctions never run forever. Forced close time ensures fair, time-bound competition.',
    },
    {
      icon: '🧩',
      title: 'Multi-Round Support',
      desc: 'Suppliers can list items across multiple rounds. Buyers get deep comparative views.',
    },
    {
      icon: '🏺',
      title: 'Any Category',
      desc: 'From paintings and antiques to books, artifacts, and collectibles — list anything.',
    },
    {
      icon: '📜',
      title: 'Activity Log',
      desc: 'Every bid, extension, and rank change is logged with timestamps for full transparency.',
    },
  ];

  const stats = [
    { value: '200+', label: 'Auctions Run' },
    { value: '40+', label: 'Active Suppliers' },
    { value: '₹2.4Cr', label: 'Total Bids Placed' },
    { value: '99.9%', label: 'Uptime' },
  ];

  const categories = [
    { name: 'Paintings', emoji: '🎨' },
    { name: 'Antiques', emoji: '🏺' },
    { name: 'Rare Books', emoji: '📚' },
    { name: 'Artifacts', emoji: '🗿' },
    { name: 'Jewelry', emoji: '💎' },
    { name: 'Sculptures', emoji: '🗽' },
    { name: 'Ceramics', emoji: '🏛️' },
    { name: 'Coins', emoji: '🪙' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font-body)',
      overflowX: 'hidden',
    }}>

      {/* ─── Topbar ─── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 28px',
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--gold) 0%, #b8860b 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 14, color: '#000', fontWeight: 900, letterSpacing: 1,
            }}>B</div>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--gold)',
              letterSpacing: 4,
            }}>BARS</span>
            <span style={{
              fontSize: 10, color: 'var(--text-muted)', borderLeft: '1px solid var(--border)',
              paddingLeft: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>British Auction RFQ System</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '8px 20px', background: 'transparent',
                border: '1px solid var(--border-hover)', borderRadius: 8,
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.target.style.borderColor = 'var(--gold)'; e.target.style.color = 'var(--gold)'; }}
              onMouseLeave={(e) => { e.target.style.borderColor = 'var(--border-hover)'; e.target.style.color = 'var(--text-primary)'; }}
            >Sign In</button>
            <button
              onClick={() => navigate('/login?mode=register')}
              style={{
                padding: '8px 20px', background: 'var(--gold)', border: 'none', borderRadius: 8,
                color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-body)', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.target.style.background = 'var(--gold-light)'; e.target.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.target.style.background = 'var(--gold)'; e.target.style.transform = 'translateY(0)'; }}
            >Get Started →</button>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '120px 28px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Radial background glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(212,160,23,0.07) 0%, transparent 70%)',
        }} />
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />

        {/* Live badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 100, background: 'rgba(34,197,94,0.06)',
          marginBottom: 36,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent-green)',
            boxShadow: '0 0 8px rgba(34,197,94,0.8)',
            display: 'inline-block',
            animation: 'pulse-dot 2s infinite',
          }} />
          <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600, letterSpacing: '0.08em' }}>
            LIVE AUCTIONS RUNNING NOW
          </span>
        </div>

        {/* Main headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(52px, 8vw, 96px)',
          lineHeight: 0.95,
          letterSpacing: '0.04em',
          color: 'var(--text-primary)',
          marginBottom: 12,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
        }}>
          BID SMART,
          <br />
          <span style={{
            color: 'transparent',
            WebkitTextStroke: '2px var(--gold)',
          }}>WIN BIG</span>
        </h1>

        <p style={{
          fontSize: 18, color: 'var(--text-secondary)', maxWidth: 560,
          lineHeight: 1.7, marginBottom: 48,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s',
        }}>
          BARS is a British-style RFQ auction platform where suppliers compete in real-time.
          Automatic time extensions, live rankings, and forced close rules keep every auction fair.
        </p>

        <div style={{
          display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s',
        }}>
          <button
            onClick={() => navigate('/login?mode=register')}
            style={{
              padding: '15px 36px', background: 'var(--gold)', border: 'none',
              borderRadius: 10, color: '#000', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              letterSpacing: '0.04em', transition: 'all 0.2s',
              boxShadow: '0 0 40px rgba(212,160,23,0.25)',
            }}
            onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 40px rgba(212,160,23,0.4)'; }}
            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 0 40px rgba(212,160,23,0.25)'; }}
          >Start Bidding Free</button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '15px 36px', background: 'transparent',
              border: '1px solid var(--border-hover)', borderRadius: 10,
              color: 'var(--text-primary)', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.borderColor = 'var(--gold)'; e.target.style.color = 'var(--gold)'; }}
            onMouseLeave={(e) => { e.target.style.borderColor = 'var(--border-hover)'; e.target.style.color = 'var(--text-primary)'; }}
          >Sign In to Existing Account</button>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          opacity: 0.4,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>SCROLL</div>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, var(--text-muted), transparent)' }} />
        </div>
      </section>

      {/* ─── Stats bar ─── */}
      <section style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '32px 28px',
      }}>
        <div style={{
          maxWidth: 1000, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
        }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{
              textAlign: 'center', padding: '8px 0',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 36,
                color: 'var(--gold)', letterSpacing: 2, lineHeight: 1,
              }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section style={{ padding: '100px 28px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>The Process</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 52, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>HOW IT WORKS</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            { step: '01', title: 'Buyer Creates RFQ', desc: 'Set up the auction with item details, bid window, trigger config, and forced close time.' },
            { step: '02', title: 'Suppliers Compete', desc: 'Invited suppliers submit bids in real time. Ranks update live — L1, L2, L3 and beyond.' },
            { step: '03', title: 'Auto Extensions Fire', desc: 'Late bids trigger time extensions automatically. Forced close ensures the auction always ends.' },
          ].map((step) => (
            <div key={step.step} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              padding: '40px 32px', position: 'relative',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold-border)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 72,
                color: 'rgba(212,160,23,0.08)', position: 'absolute', top: 20, right: 24,
                lineHeight: 1, letterSpacing: 2,
              }}>{step.step}</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--gold)',
                letterSpacing: '0.12em', marginBottom: 16,
              }}>{step.step}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Categories ─── */}
      <section style={{
        padding: '80px 28px',
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>What Gets Auctioned</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 48, letterSpacing: '0.04em' }}>AUCTION CATEGORIES</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 12 }}>
            {categories.map((cat) => (
              <div key={cat.name} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '24px 12px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 12, cursor: 'default',
                transition: 'all 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.background = 'var(--gold-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
              >
                <span style={{ fontSize: 28 }}>{cat.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', textAlign: 'center' }}>{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section style={{ padding: '100px 28px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Platform Capabilities</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 52, letterSpacing: '0.04em' }}>BUILT FOR FAIR AUCTIONS</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {features.map((f) => (
            <div key={f.title} style={{
              padding: '28px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 12,
              transition: 'all 0.25s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{
        padding: '100px 28px', textAlign: 'center',
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,160,23,0.06) 0%, transparent 70%)',
        }} />
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 6vw, 72px)',
          letterSpacing: '0.04em', color: 'var(--text-primary)', marginBottom: 20,
          position: 'relative',
        }}>
          READY TO START<br />WINNING AUCTIONS?
        </h2>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 44, position: 'relative' }}>
          Join buyers and suppliers already using BARS for transparent, fair procurement.
        </p>
        <button
          onClick={() => navigate('/login?mode=register')}
          style={{
            padding: '18px 56px', background: 'var(--gold)', border: 'none',
            borderRadius: 10, color: '#000', fontSize: 16, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'var(--font-body)', letterSpacing: '0.06em',
            transition: 'all 0.2s', position: 'relative',
            boxShadow: '0 0 60px rgba(212,160,23,0.3)',
          }}
          onMouseEnter={(e) => { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxShadow = '0 12px 60px rgba(212,160,23,0.5)'; }}
          onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 0 60px rgba(212,160,23,0.3)'; }}
        >CREATE FREE ACCOUNT</button>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--gold)', letterSpacing: 3 }}>BARS</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>British Auction RFQ System</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>© 2026 BARS. Fair auctions, always.</div>
      </footer>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
