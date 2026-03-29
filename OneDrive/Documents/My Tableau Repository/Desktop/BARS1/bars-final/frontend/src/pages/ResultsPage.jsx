import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomAPI } from '../utils/api';

/* ─── helpers ─── */
const fmt = (amt) => {
  if (!amt && amt !== 0) return '—';
  if (amt < 1) return `₹${Math.round(amt * 100)}L`;
  return `₹${amt.toFixed(2).replace(/\.?0+$/, '')}Cr`;
};

function computeLeaderboard(participants, soldPlayers) {
  return participants
    .map((p) => {
      const myPlayers = soldPlayers.filter((s) => s.teamName === p.teamName);
      const spent = myPlayers.reduce((acc, s) => acc + (s.amount || 0), 0);
      const purseLeft = (p.purseRemaining ?? p.purseInit ?? 100);
      // Squad rating: composite score (role balance, value efficiency, count)
      const roles = { BATSMAN: 0, BOWLER: 0, 'WK-BATSMAN': 0, 'ALL-ROUNDER': 0 };
      myPlayers.forEach((s) => { if (s.playerRole) roles[s.playerRole] = (roles[s.playerRole] || 0) + 1; });
      const roleVariety = Object.values(roles).filter((v) => v > 0).length;
      const squadRating = Math.min(100, Math.round(
        (myPlayers.length * 8) + (roleVariety * 5) + Math.max(0, 20 - spent * 0.5)
      ));
      return { ...p, myPlayers, spent, purseLeft, squadRating };
    })
    .sort((a, b) => b.squadRating - a.squadRating);
}

function computeAwards(soldPlayers) {
  if (!soldPlayers.length) return [];
  // Best value pick: lowest amount paid
  const byAmount = [...soldPlayers].filter((s) => s.amount).sort((a, b) => a.amount - b.amount);
  // Most expensive: highest amount
  const mostExpensive = [...soldPlayers].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];
  // Biggest bidding war: player with most bids
  const bidCounts = {};
  soldPlayers.forEach((s) => { bidCounts[s.playerName] = (bidCounts[s.playerName] || 0) + (s.bidCount || 1); });
  const biggestWar = Object.entries(bidCounts).sort((a, b) => b[1] - a[1])[0];
  const biggestWarPlayer = soldPlayers.find((s) => s.playerName === biggestWar?.[0]);

  // Budget king: most purse remaining
  const awards = [];
  if (byAmount[0]) awards.push({ label: 'BEST VALUE PICK', player: byAmount[0].playerName, sub: `${fmt(byAmount[0].amount)} (base ${fmt((byAmount[0].basePrice || byAmount[0].amount) / 100)})` });
  if (mostExpensive) awards.push({ label: 'MOST EXPENSIVE', player: mostExpensive.playerName, sub: `Sold for ${fmt(mostExpensive.amount)}` });
  if (biggestWarPlayer) awards.push({ label: 'BIGGEST BIDDING WAR', player: biggestWarPlayer.playerName, sub: `${biggestWar[1]} bids placed` });
  return awards;
}

/* ─── Confetti component ─── */
function Confetti() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 10 + 4,
      h: Math.random() * 6 + 3,
      color: ['#d4a017', '#f0c040', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'][Math.floor(Math.random() * 6)],
      speed: Math.random() * 2 + 1,
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 4,
      drift: (Math.random() - 0.5) * 1.5,
    }));
    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.y += p.speed;
        p.x += p.drift;
        p.angle += p.spin;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      });
      frame = requestAnimationFrame(draw);
    };
    draw();
    const t = setTimeout(() => cancelAnimationFrame(frame), 5000);
    return () => { cancelAnimationFrame(frame); clearTimeout(t); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

/* ─── Leaderboard Row ─── */
function LeaderboardRow({ team, rank, expanded, onToggle }) {
  const rankColor = rank === 1 ? 'var(--gold)' : rank === 2 ? '#9ca3af' : rank === 3 ? '#cd7c3a' : 'var(--text-muted)';

  return (
    <div style={{ marginBottom: 8, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid', borderColor: rank === 1 ? 'var(--gold-border)' : 'var(--border)', background: rank === 1 ? 'rgba(212,160,23,0.04)' : 'var(--bg-card)' }}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', gap: 16 }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: rankColor, minWidth: 32 }}>#{rank}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{team.teamName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', gap: 12 }}>
            <span>{team.myPlayers.length} players</span>
            <span>|</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(team.spent)}Cr spent</span>
            <span>|</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>₹{team.purseLeft}Cr left</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: rankColor }}>
              {team.squadRating}/100
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
            ∨
          </div>
        </div>
      </div>

      {/* Expanded player list */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px 16px' }}>
          {team.myPlayers.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>No players acquired</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {team.myPlayers.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${(p.playerId || i) * 47}, 50%, 25%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                      {p.playerName?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.playerName}</div>
                      {p.playerRole && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.playerRole}</div>}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 700, fontSize: 14 }}>
                    {fmt(p.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Award Card ─── */
function AwardCard({ label, player, sub }) {
  return (
    <div style={{ minWidth: 180, padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{player}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sub}</div>
    </div>
  );
}

/* ─── Excel download helper ─── */
function downloadExcel(leaderboard, roomName) {
  const rows = [];
  rows.push(['Rank', 'Team', 'Squad Rating', 'Players', 'Spent (Cr)', 'Purse Left (Cr)']);
  leaderboard.forEach((t, i) => {
    rows.push([i + 1, t.teamName, `${t.squadRating}/100`, t.myPlayers.length, t.spent.toFixed(2), t.purseLeft]);
    t.myPlayers.forEach((p) => rows.push(['', '', `  • ${p.playerName}`, p.playerRole || '', fmt(p.amount), '']));
  });
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${roomName || 'auction'}-results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Main Results Page ─── */
export default function ResultsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State can come from navigation or be fetched
  const passedState = location.state || {};
  const [room, setRoom] = useState(passedState.room || null);
  const [soldPlayers, setSoldPlayers] = useState(passedState.soldPlayers || []);
  const [loading, setLoading] = useState(!passedState.room);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (!passedState.room && id) {
      roomAPI.get(id).then(({ data }) => {
        setRoom(data.room);
        setLoading(false);
      }).catch(() => { navigate('/'); });
    }
    const t = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(t);
  }, [id, passedState.room, navigate]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  if (!room) return null;

  const participants = room.participants || [];
  const leaderboard = computeLeaderboard(participants, soldPlayers);
  const awards = computeAwards(soldPlayers);
  const winner = leaderboard[0];

  // Budget king award (team with most purse left)
  const budgetKing = [...leaderboard].sort((a, b) => b.purseLeft - a.purseLeft)[0];
  const allAwards = [
    ...awards,
    budgetKing && { label: 'BUDGET KING', player: budgetKing.teamName, sub: `₹${budgetKing.purseLeft}Cr remaining` },
  ].filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      {showConfetti && <Confetti />}

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--gold)', letterSpacing: 3 }}>RESULTS</span>
          <span className="dot dot-green" style={{ width: 7, height: 7 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
            {user?.name?.slice(0, 1).toUpperCase()}
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{user?.name?.toUpperCase()}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '52px 24px 36px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: 48, height: 3, background: 'var(--gold)', borderRadius: 2, margin: '0 auto 28px' }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 54, color: 'var(--gold)', letterSpacing: 3, lineHeight: 1, marginBottom: 8, animation: 'glow 2s ease-in-out infinite' }}>
          Auction Complete
        </h1>
        <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 28 }}>{room.name}</div>

        {/* Winner badge */}
        {winner && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 28px', background: 'rgba(212,160,23,0.12)', border: '1px solid var(--gold-border)', borderRadius: 100, fontSize: 16, fontWeight: 700, color: 'var(--gold)', animation: 'pulse-gold 2s infinite' }}>
            <span style={{ fontSize: 18 }}>★</span>
            {winner.teamName}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-secondary)', fontWeight: 400 }}>
              {winner.squadRating}/100
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 60px', position: 'relative', zIndex: 1 }}>

        {/* Fantasy Leaderboard label */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
          Fantasy Leaderboard
        </div>

        {/* Leaderboard rows */}
        <div style={{ marginBottom: 28 }}>
          {leaderboard.map((team, i) => (
            <LeaderboardRow
              key={team.teamName}
              team={team}
              rank={i + 1}
              expanded={expandedTeam === team.teamName}
              onToggle={() => setExpandedTeam(expandedTeam === team.teamName ? null : team.teamName)}
            />
          ))}
        </div>

        {/* Download Excel */}
        <button
          onClick={() => downloadExcel(leaderboard, room.name)}
          className="btn btn-lg btn-full"
          style={{ background: 'rgba(212,160,23,0.15)', border: '1px solid var(--gold-border)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 15, marginBottom: 28 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Download Excel
        </button>

        {/* How points are calculated */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            How Points Are Calculated
          </span>
        </div>

        {/* Support */}
        <div style={{ textAlign: 'center', marginBottom: 28, color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ color: 'var(--accent-red)' }}>♥</span>
          Enjoying this? Consider supporting the project
        </div>

        {/* Squad Rating info box */}
        <div style={{ padding: '18px 20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 28, lineHeight: 1.7 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 700, color: 'var(--gold)' }}>Squad Rating: </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Teams are ranked by a composite score based on squad completeness, role balance, value efficiency, purse management, and player diversity.</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Fantasy points will be updated live once the IPL season starts. Come back to this room anytime to check the latest standings.
          </div>
        </div>

        {/* Awards section */}
        {allAwards.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Awards</div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {allAwards.map((a, i) => (
                <AwardCard key={i} label={a.label} player={a.player} sub={a.sub} />
              ))}
            </div>
            {/* Scroll indicator */}
            <div style={{ marginTop: 8, height: 3, background: 'var(--border)', borderRadius: 2 }}>
              <div style={{ width: '60%', height: '100%', background: 'var(--gold)', borderRadius: 2 }} />
            </div>
          </div>
        )}

        {/* Back to home */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            Back to Home
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>🖊 Crafted by Afsal tech</div>
      </div>
    </div>
  );
}
