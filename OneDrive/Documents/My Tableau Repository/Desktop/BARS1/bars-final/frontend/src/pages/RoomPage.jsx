import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { roomAPI } from '../utils/api';
import { usePerBidTimer } from '../hooks/useCountdown';
import toast from 'react-hot-toast';

const REACTIONS = ['🔥', '😱', '💰', '😂', '👋', '💀'];

const SAMPLE_PLAYERS = [
  { id: 1, name: 'Virat Kohli', role: 'BATSMAN', team: 'RCB', country: 'India', style: 'Right Handed Bat | Right-arm medium', basePrice: 200, image: null },
  { id: 2, name: 'Rohit Sharma', role: 'BATSMAN', team: 'MI', country: 'India', style: 'Right Handed Bat | Right-arm medium', basePrice: 200, image: null },
  { id: 3, name: 'Jasprit Bumrah', role: 'BOWLER', team: 'MI', country: 'India', style: 'Right-arm fast', basePrice: 200, image: null },
  { id: 4, name: 'MS Dhoni', role: 'WK-BATSMAN', team: 'CSK', country: 'India', style: 'Right Handed Bat | Right-arm medium', basePrice: 200, image: null },
  { id: 5, name: 'Jack Edwards', role: 'BATSMAN', team: 'SRH', country: 'Australia', style: 'Right Handed Bat | Right-arm medium', basePrice: 25, image: null },
  { id: 6, name: 'Akshat Raghuwanshi', role: 'BATSMAN', team: 'LSG', country: 'India', style: 'Right Handed Bat | Right-arm offbreak', basePrice: 25, image: null },
];

export default function RoomPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [players, setPlayers] = useState(SAMPLE_PLAYERS);
  const [currentBid, setCurrentBid] = useState(null);
  const [leadingTeam, setLeadingTeam] = useState(null);
  const [bidLog, setBidLog] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [reactions, setReactions] = useState([]);
  const [soldPlayers, setSoldPlayers] = useState([]);
  const timerRef = useRef(null);

  const isHost = room?.host?._id === user?._id || room?.host === user?._id;
  const currentPlayer = players[currentPlayerIdx];
  const myParticipant = room?.participants?.find((p) => p.user?._id === user?._id || p.user === user?._id);

  const timerDuration = room?.config?.timer || 15;
  const [timerRunning, setTimerRunning] = useState(false);

  const handleTimerExpire = useCallback(() => {
    if (isHost && started && !paused) {
      // Auto-sell or skip
      if (currentBid && leadingTeam) {
        handleSold();
      } else {
        handleUnsold();
      }
    }
  }, [isHost, started, paused, currentBid, leadingTeam]);

  const { timeLeft, reset: resetTimer } = usePerBidTimer(timerDuration, timerRunning && started && !paused, handleTimerExpire);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await roomAPI.get(id);
        setRoom(data.room);
        if (data.room.status === 'active') { setStarted(true); setTimerRunning(true); }
        if (data.room.status === 'paused') { setStarted(true); setPaused(true); }
      } catch { toast.error('Room not found'); navigate('/'); }
      finally { setLoading(false); }
    };
    load();
  }, [id, navigate]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('room:join', { roomId: id });

    socket.on('room:participantsUpdate', ({ participants }) => {
      setRoom((r) => r ? { ...r, participants } : r);
    });
    socket.on('room:started', ({ room: r }) => { setRoom(r); setStarted(true); setTimerRunning(true); });
    socket.on('room:paused', () => { setPaused(true); setTimerRunning(false); });
    socket.on('room:nextPlayer', ({ player }) => {
      if (player) setCurrentPlayerIdx((i) => i + 1);
      setCurrentBid(null); setLeadingTeam(null); setBidLog([]);
      resetTimer(); setTimerRunning(true);
    });
    socket.on('room:playerSold', (data) => {
      setSoldPlayers((s) => [...s, data]);
      toast.success(`${data.playerName} sold to ${data.teamName} for ₹${data.amount}Cr!`);
    });
    socket.on('room:playerUnsold', (data) => toast.error(`${data.playerName} unsold`));
    socket.on('room:ended', ({ soldPlayers: sp }) => {
      // Non-host participants get redirected to results too
      navigate(`/room/${id}/results`, { state: { room, soldPlayers: sp || [] } });
    });
    socket.on('room:bidUpdate', ({ bidAmount, teamName, bidderName, playerId }) => {
      setCurrentBid(bidAmount);
      setLeadingTeam(teamName);
      setBidLog((prev) => [{ teamName, bidAmount, bidderName, time: new Date() }, ...prev].slice(0, 10));
      resetTimer();
      setTimerRunning(true);
    });
    socket.on('room:configUpdated', ({ config }) => setRoom((r) => r ? { ...r, config } : r));
    socket.on('room:chatMessage', (msg) => setChatMessages((prev) => [...prev, msg]));
    socket.on('room:reactionBroadcast', ({ emoji, from }) => {
      const rid = Date.now();
      setReactions((r) => [...r, { id: rid, emoji, from }]);
      setTimeout(() => setReactions((r) => r.filter((x) => x.id !== rid)), 2500);
    });

    return () => {
      socket.emit('room:leave', { roomId: id });
      socket.off('room:participantsUpdate');
      socket.off('room:started');
      socket.off('room:paused');
      socket.off('room:nextPlayer');
      socket.off('room:playerSold');
      socket.off('room:playerUnsold');
      socket.off('room:bidUpdate');
      socket.off('room:configUpdated');
      socket.off('room:chatMessage');
      socket.off('room:reactionBroadcast');
      socket.off('room:ended');
    };
  }, [socket, id, resetTimer]);

  const handleStart = async () => {
    await roomAPI.updateStatus(id, 'active');
    socket?.emit('room:hostAction', { roomId: id, action: 'start' });
    setStarted(true); setPaused(false); setTimerRunning(true);
  };

  const handlePause = async () => {
    await roomAPI.updateStatus(id, 'paused');
    socket?.emit('room:hostAction', { roomId: id, action: 'pause' });
    setPaused(true); setTimerRunning(false);
  };

  const handleNextPlayer = () => {
    socket?.emit('room:hostAction', { roomId: id, action: 'nextPlayer', data: { player: players[currentPlayerIdx + 1] } });
    setCurrentPlayerIdx((i) => i + 1);
    setCurrentBid(null); setLeadingTeam(null); setBidLog([]);
    resetTimer(); setTimerRunning(true);
  };

  const handleSold = () => {
    const data = {
      playerName: currentPlayer?.name,
      playerRole: currentPlayer?.role,
      playerId: currentPlayer?.id,
      basePrice: currentPlayer?.basePrice,
      teamName: leadingTeam,
      amount: currentBid,
      bidCount: bidLog.length,
    };
    socket?.emit('room:hostAction', { roomId: id, action: 'sold', data });
    const updatedSold = [...soldPlayers, data];
    setSoldPlayers(updatedSold);
    // Check if all players done
    if (currentPlayerIdx >= players.length - 1) {
      endAuction(updatedSold);
      return;
    }
    handleNextPlayer();
  };

  const handleUnsold = () => {
    socket?.emit('room:hostAction', { roomId: id, action: 'unsold', data: { playerName: currentPlayer?.name, playerId: currentPlayer?.id } });
    if (currentPlayerIdx >= players.length - 1) {
      endAuction(soldPlayers);
      return;
    }
    handleNextPlayer();
  };

  const endAuction = async (finalSoldPlayers) => {
    try {
      await roomAPI.updateStatus(id, 'completed');
    } catch (e) {}
    socket?.emit('room:hostAction', { roomId: id, action: 'ended', data: { soldPlayers: finalSoldPlayers } });
    navigate(`/room/${id}/results`, { state: { room, soldPlayers: finalSoldPlayers } });
  };

  const placeBid = (increment) => {
    const base = currentBid || (currentPlayer?.basePrice / 100);
    const newBid = parseFloat((base + increment).toFixed(2));
    socket?.emit('room:bid', { roomId: id, playerId: currentPlayer?.id, bidAmount: newBid, teamName: myParticipant?.teamName });
    setCurrentBid(newBid);
    setLeadingTeam(myParticipant?.teamName);
    setBidLog((prev) => [{ teamName: myParticipant?.teamName, bidAmount: newBid, bidderName: user.name, time: new Date(), isMe: true }, ...prev].slice(0, 10));
    resetTimer(); setTimerRunning(true);
  };

  const sendReaction = (emoji) => {
    socket?.emit('room:reaction', { roomId: id, emoji });
    const rid = Date.now();
    setReactions((r) => [...r, { id: rid, emoji, from: 'You' }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== rid)), 2500);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socket?.emit('room:chat', { roomId: id, message: chatInput });
    setChatMessages((p) => [...p, { message: chatInput, from: user.name, timestamp: new Date(), isMe: true }]);
    setChatInput('');
  };

  const formatAmount = (amt) => {
    if (!amt) return '—';
    if (amt < 1) return `₹${Math.round(amt * 100)}L`;
    return `₹${amt}Cr`;
  };

  const timerPercent = (timeLeft / timerDuration) * 100;
  const timerUrgent = timeLeft <= 5;
  const timerWarning = timeLeft <= 10;
  const isLeading = leadingTeam === myParticipant?.teamName;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  if (!room) return null;

  // ===== WAITING ROOM =====
  if (!started) {
    return <WaitingRoom room={room} isHost={isHost} onStart={handleStart} myParticipant={myParticipant} onLeave={() => navigate('/')} onConfigChange={(cfg) => { roomAPI.updateRoomConfig(id, cfg); socket?.emit('room:hostAction', { roomId: id, action: 'configUpdate', data: cfg }); }} />;
  }

  // ===== LIVE AUCTION =====
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 48, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="dot dot-gold" style={{ animation: 'pulse-gold 2s infinite' }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Round {room.currentRound || 1}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>| {currentPlayerIdx + 1}/{players.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isHost && (
            <>
              {paused
                ? <button className="btn btn-outline btn-sm" onClick={() => { setPaused(false); setTimerRunning(true); }}>Resume</button>
                : <button className="btn btn-ghost btn-sm" onClick={handlePause}>Pause</button>
              }
              <button className="btn btn-danger btn-sm" onClick={() => endAuction(soldPlayers)}>End Round</button>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.name?.toUpperCase()}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: 0 }}>
        {/* Center panel */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 24px', gap: 16 }}>
          {/* Player category badge */}
          {currentPlayer && (
            <>
              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {currentPlayer.role}S <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({players.filter((_, i) => i >= currentPlayerIdx).length} remaining)</span>
              </div>

              {/* Player card */}
              <div className="card" style={{ padding: 20, border: '1px solid var(--gold-border)', background: 'rgba(212,160,23,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                    background: currentPlayer.image ? `url(${currentPlayer.image})` : `hsl(${currentPlayer.id * 47}, 60%, 30%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700, color: '#fff', border: '2px solid var(--gold-border)',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                  }}>
                    {!currentPlayer.image && currentPlayer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{currentPlayer.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ padding: '2px 8px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{currentPlayer.role}</span>
                      <span className="dot" style={{ width: 6, height: 6, background: 'var(--accent-green)', borderRadius: '50%' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{currentPlayer.team}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentPlayer.country}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{currentPlayer.style}</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  BASE PRICE <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginLeft: 8 }}>
                    {formatAmount(currentPlayer.basePrice / 100)}
                  </span>
                </div>
              </div>

              {/* Current Bid */}
              <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="dot" style={{ width: 6, height: 6, background: 'var(--accent-green)', borderRadius: '50%' }} />
                  {currentBid ? 'CURRENT BID' : 'BASE PRICE'}
                </div>
                <div style={{
                  fontSize: 52, fontFamily: 'var(--font-display)', fontWeight: 400,
                  color: currentBid ? 'var(--gold)' : 'var(--text-primary)',
                  animation: currentBid ? 'glow 2s ease-in-out infinite' : 'none',
                  letterSpacing: 2, lineHeight: 1,
                }}>
                  {formatAmount(currentBid || currentPlayer.basePrice / 100)}
                </div>
                <div style={{ marginTop: 10 }}>
                  {currentBid ? (
                    <span style={{
                      padding: '4px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                      background: isLeading ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                      color: isLeading ? 'var(--accent-green)' : 'var(--text-secondary)',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      <span className="dot" style={{ width: 6, height: 6, background: isLeading ? 'var(--accent-green)' : 'var(--text-muted)', borderRadius: '50%' }} />
                      {isLeading ? 'You are leading!' : `${leadingTeam} is leading`}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No bids yet — be the first!</span>
                  )}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>Base: {formatAmount(currentPlayer.basePrice / 100)}</div>
              </div>
            </>
          )}

          {/* Timer */}
          <div style={{ textAlign: 'center' }}>
            <div className={`timer-display ${timerUrgent ? 'urgent' : timerWarning ? 'warning' : ''}`} style={{ fontSize: 64 }}>
              <span className="dot" style={{ width: 10, height: 10, background: timerUrgent ? 'var(--accent-red)' : 'var(--accent-green)', borderRadius: '50%', marginRight: 12, display: 'inline-block', verticalAlign: 'middle' }} />
              {timeLeft}
            </div>
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div className={`progress-fill ${timerUrgent ? 'urgent' : timerWarning ? 'warning' : ''}`} style={{ width: `${timerPercent}%` }} />
            </div>
          </div>

          {/* Bid log */}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {bidLog.map((b, i) => (
              <span key={i}>
                <span className="dot" style={{ width: 5, height: 5, background: 'var(--accent-green)', borderRadius: '50%', display: 'inline-block', marginRight: 4 }} />
                <span style={{ color: b.isMe ? 'var(--gold)' : 'var(--text-primary)', fontWeight: b.isMe ? 700 : 400 }}>{b.teamName}</span>
                {' '}bid {formatAmount(b.bidAmount)}
                {i < bidLog.length - 1 && <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>·</span>}
              </span>
            ))}
          </div>

          {/* Action buttons (at bottom) */}
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            {isHost && started ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {currentBid && <button className="btn btn-gold btn-lg" onClick={handleSold}>SOLD ✓</button>}
                <button className="btn btn-outline btn-lg" onClick={handleUnsold}>UNSOLD</button>
                <button className="btn btn-outline btn-lg" onClick={handleNextPlayer}>NEXT PLAYER →</button>
              </div>
            ) : isLeading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <button className="btn btn-outline btn-lg" onClick={() => placeBid(0.25)} style={{ opacity: 0.4, cursor: 'not-allowed' }} disabled>+₹25L</button>
                <button className="btn btn-outline btn-lg" onClick={() => placeBid(0.50)} style={{ opacity: 0.4, cursor: 'not-allowed' }} disabled>+₹50L</button>
                <button className="btn btn-outline btn-lg" onClick={() => placeBid(1)} style={{ opacity: 0.4, cursor: 'not-allowed' }} disabled>+₹1Cr</button>
                <div style={{ gridColumn: '1/-1', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>You're leading</div>
              </div>
            ) : currentBid ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 120px', gap: 10 }}>
                <button className="btn btn-gold btn-lg" onClick={() => placeBid(0.25)}>+₹25L</button>
                <button className="btn btn-gold btn-lg" onClick={() => placeBid(0.50)}>+₹50L</button>
                <button className="btn btn-gold btn-lg" onClick={() => placeBid(1)}>+₹1Cr</button>
                <button className="btn btn-danger btn-lg" onClick={() => {}}>Withdraw</button>
              </div>
            ) : (
              <button className="btn btn-gold btn-lg btn-full" onClick={() => placeBid(0)}>
                Bid {formatAmount(currentPlayer?.basePrice / 100)}
              </button>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          {/* Purse */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>● YOUR PURSE</div>
            <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', color: 'var(--gold)', letterSpacing: 2 }}>
              {myParticipant?.purseRemaining || room.config?.purse} Cr
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>0 of {room.config?.squadSize} slots filled</div>
          </div>

          {/* Reactions */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => sendReaction(emoji)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '3px 0', textAlign: 'right', transition: 'transform 0.1s' }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >{emoji}</button>
            ))}
            <button onClick={() => setChatOpen((v) => !v)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 20, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
            >💬 Chat</button>
          </div>

          {/* Teams */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>TEAMS</div>
            {room.participants?.map((p) => {
              const isMe = p.user?._id === user?._id || p.user === user?._id;
              const isCurrentLeader = leadingTeam === p.teamName;
              return (
                <div key={p._id || p.user?._id} style={{
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                  borderLeft: isMe ? '2px solid var(--gold)' : '2px solid transparent',
                  paddingLeft: isMe ? 10 : 0, marginLeft: isMe ? -10 : 0,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isMe ? 'var(--gold)' : 'var(--text-primary)' }}>{p.teamName}</span>
                      {isMe && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> (you)</span>}
                      {isCurrentLeader && <span style={{ marginLeft: 6, color: 'var(--accent-green)', fontSize: 10 }}>▲</span>}
                    </div>
                    {p.role === 'host' && <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700 }}>ADMIN</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <span>₹{p.purseRemaining || room.config?.purse}Cr</span>
                    <span>{soldPlayers.filter((s) => s.teamName === p.teamName).length}/{room.config?.squadSize} slots</span>
                  </div>
                  {/* Players bought */}
                  {soldPlayers.filter((s) => s.teamName === p.teamName).map((s, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span>• {s.playerName}</span>
                      <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>{formatAmount(s.amount)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating reactions */}
      <div style={{ position: 'fixed', right: 300, bottom: 100, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {reactions.map((r) => (
          <div key={r.id} style={{ fontSize: 28, animation: 'fadeIn 0.3s ease', opacity: 1 }}>{r.emoji}</div>
        ))}
      </div>

      {/* Chat overlay */}
      {chatOpen && (
        <div style={{
          position: 'fixed', right: 290, bottom: 0, width: 280, height: 380,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', display: 'flex', flexDirection: 'column',
          zIndex: 20, boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Chat</span>
            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>×</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ textAlign: m.isMe ? 'right' : 'left' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{m.from}</div>
                <div style={{
                  display: 'inline-block', padding: '6px 12px', borderRadius: 12, fontSize: 13,
                  background: m.isMe ? 'var(--gold)' : 'var(--bg-secondary)',
                  color: m.isMe ? '#000' : 'var(--text-primary)',
                }}>{m.message}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Type a message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} />
            <button className="btn btn-gold btn-sm" onClick={sendChat}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WaitingRoom({ room, isHost, onStart, myParticipant, onLeave, onConfigChange }) {
  const [config, setConfig] = useState(room.config || {});
  const navigate = useNavigate();

  const handleConfigChange = (k, v) => {
    const newCfg = { ...config, [k]: v };
    setConfig(newCfg);
    onConfigChange(newCfg);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Home
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
            N
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>NITISH</span>
        </div>
      </div>

      <div className="page-container" style={{ paddingTop: 28, maxWidth: 600 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--gold)', marginBottom: 20, letterSpacing: 2 }}>{room.name}</h1>

        {/* Room code */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, letterSpacing: 12, color: 'var(--text-primary)' }}>{room.code}</span>
            <button className="btn btn-outline" onClick={() => { navigator.clipboard.writeText(room.code); }}>Copy Code</button>
          </div>
        </div>

        {/* Participants */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="section-title" style={{ margin: 0 }}>PARTICIPANTS</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{room.participants?.length || 0} / {room.config?.maxParticipants || 20} joined</span>
          </div>
          {room.participants?.map((p) => {
            const isMe = p.user?._id === myParticipant?.user?._id;
            return (
              <div key={p._id || p.user?._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid', borderColor: isMe ? 'var(--gold-border)' : 'var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="dot" style={{ width: 8, height: 8, background: p.isOnline ? 'var(--accent-green)' : 'var(--text-muted)', borderRadius: '50%', boxShadow: p.isOnline ? '0 0 6px rgba(34,197,94,0.5)' : 'none' }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{p.teamName}</span>
                  {isMe && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(you)</span>}
                </div>
                {p.role === 'host' && <span style={{ padding: '2px 10px', background: 'var(--gold-bg)', color: 'var(--gold)', border: '1px solid var(--gold-border)', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>ADMIN</span>}
              </div>
            );
          })}
        </div>

        {/* Config (host only) */}
        {isHost && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="label">Purse</label>
                <select className="input select" value={config.purse} onChange={(e) => handleConfigChange('purse', Number(e.target.value))}>
                  {[100, 150, 200, 250].map((p) => <option key={p} value={p}>₹{p} Cr</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Squad</label>
                <select className="input select" value={config.squadSize} onChange={(e) => handleConfigChange('squadSize', Number(e.target.value))}>
                  {[11, 13, 15, 18].map((s) => <option key={s} value={s}>{s} players</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Timer</label>
                <select className="input select" value={config.timer} onChange={(e) => handleConfigChange('timer', Number(e.target.value))}>
                  {[10, 15, 20, 25, 30].map((t) => <option key={t} value={t}>{t}s</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Order</label>
                <select className="input select" value={config.order} onChange={(e) => handleConfigChange('order', e.target.value)}>
                  <option value="random">Random</option>
                  <option value="byCategory">By Category</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Choose Players */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(212,160,23,0.06)', borderColor: 'var(--gold-border)' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Choose Players</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{SAMPLE_PLAYERS.length} of {SAMPLE_PLAYERS.length} selected</span>
        </div>

        {/* Start / waiting */}
        {isHost ? (
          <button className="btn btn-gold btn-lg btn-full" onClick={onStart} style={{ marginBottom: 12, animation: 'pulse-gold 2s infinite' }}>
            Start Auction
          </button>
        ) : (
          <div style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
            Waiting for participants...
          </div>
        )}

        <button className="btn btn-danger btn-full" onClick={onLeave}>Leave Room</button>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>🖊 Crafted by Afsal tech</div>
      </div>
    </div>
  );
}
