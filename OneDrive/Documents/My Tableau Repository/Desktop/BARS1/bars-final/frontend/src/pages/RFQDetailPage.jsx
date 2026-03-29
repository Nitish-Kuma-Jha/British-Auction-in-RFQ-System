import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rfqAPI, bidAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCountdown, formatCountdown } from '../hooks/useCountdown';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function RFQDetailPage() {
  const { id } = useParams();
  const { user, isSupplier, isBuyer, isAdmin } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [rfq, setRfq]         = useState(null);
  const [bids, setBids]        = useState([]);
  const [loading, setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState('bids');
  const [showBidForm, setShowBidForm] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [extensionAlert, setExtensionAlert] = useState(null);

  const [bidForm, setBidForm] = useState({
    bidAmount: '',
    supplierNote: '',
    quoteValidity: '',
  });

  const countdown       = useCountdown(rfq?.currentCloseTime);
  const forcedCountdown = useCountdown(rfq?.forcedBidCloseTime);
  const isExpired = !countdown;
  const isUrgent  = countdown && countdown.diff < 10 * 60 * 1000;
  const isWarning = countdown && countdown.diff < 30 * 60 * 1000;

  const load = useCallback(async () => {
    try {
      const { data } = await rfqAPI.get(id);
      setRfq(data.rfq);
      setBids(data.bids || []);
    } catch {
      toast.error('Auction not found');
      navigate('/rfq');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('rfq:join', { rfqId: id });

    socket.on('bid:new', ({ allBids, extensionResult }) => {
      setBids(allBids || []);
      if (extensionResult?.extended) {
        setRfq((r) => r ? { ...r, currentCloseTime: extensionResult.newCloseTime } : r);
        setExtensionAlert(extensionResult);
        setTimeout(() => setExtensionAlert(null), 7000);
        toast.success(`⏱ Extended +${extensionResult.extensionDuration} min — ${extensionResult.reason}`);
      }
    });

    socket.on('rfq:statusChanged', ({ status }) => {
      setRfq((r) => r ? { ...r, status } : r);
    });

    return () => {
      socket.emit('rfq:leave', { rfqId: id });
      socket.off('bid:new');
      socket.off('rfq:statusChanged');
    };
  }, [socket, id]);

  const handlePlaceBid = async () => {
    const amount = Number(bidForm.bidAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid bid amount'); return; }

    // Warn if bid is higher than L1
    const l1Amount = bids[0]?.quote?.totalAmount;
    if (l1Amount && amount >= l1Amount) {
      toast.error(`Your bid ₹${amount.toLocaleString()} must be lower than the current L1 bid ₹${l1Amount.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      await bidAPI.place({
        rfqId: id,
        quote: {
          bidAmount: amount,
          supplierNote: bidForm.supplierNote,
          quoteValidity: bidForm.quoteValidity || undefined,
        },
      });
      toast.success('Bid placed! Rankings updated.');
      setShowBidForm(false);
      setBidForm({ bidAmount: '', supplierNote: '', quoteValidity: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place bid');
    } finally { setSubmitting(false); }
  };

  const handleCloseAuction = async () => {
    try {
      await rfqAPI.updateStatus(id, 'closed');
      toast.success('Auction closed');
      load();
    } catch { toast.error('Failed to close auction'); }
  };

  const handleAwardWinner = async () => {
    if (!bids[0]) { toast.error('No bids to award'); return; }
    try {
      await rfqAPI.updateStatus(id, 'awarded');
      toast.success(`Awarded to ${bids[0].supplier?.name}!`);
      load();
    } catch { toast.error('Failed to award'); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );
  if (!rfq) return null;

  const myBid   = bids.find((b) => b.supplier?._id === user?._id);
  const myRank  = myBid?.rank;
  const l1Bid   = bids[0];
  const canBid  = isSupplier && rfq.status === 'active' && !isExpired;

  const timeColor = isUrgent ? 'var(--accent-red)' : isWarning ? 'var(--accent-orange)' : 'var(--gold)';

  return (
    <div className="page-container" style={{ paddingTop: 28, paddingBottom: 56 }}>

      {/* Extension flash */}
      {extensionAlert && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--gold)', color: '#000', padding: '12px 28px',
          borderRadius: 10, fontWeight: 800, fontSize: 14, zIndex: 200,
          boxShadow: '0 8px 40px rgba(212,160,23,0.5)', animation: 'fadeIn 0.3s ease',
          display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap',
        }}>
          ⏱ Auction Extended +{extensionAlert.extensionDuration} min
          <span style={{ fontWeight: 400, fontSize: 12 }}>— {extensionAlert.reason}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/rfq')} style={{ marginBottom: 10 }}>← Back to Auctions</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 28 }}>{getCategoryEmoji(rfq.item?.category)}</span>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{rfq.rfqName?.replace(/^\[R\d+\] /, '')}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{rfq.referenceId}</span>
            <StatusBadge status={rfq.status} />
            {rfq.auctionConfig?.isBritishAuction && <span className="badge badge-gold">British Auction</span>}
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: 'rgba(212,160,23,0.12)', color: 'var(--gold)' }}>
              Round {rfq.auctionConfig?.round || 1}
            </span>
            {rfq.item?.category && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>· {rfq.item.category}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {canBid && (
            <button
              className="btn btn-gold btn-lg"
              onClick={() => setShowBidForm(true)}
              style={{ animation: isUrgent ? 'pulse-gold 2s infinite' : 'none' }}
            >
              Place Bid
            </button>
          )}
          {(isBuyer || isAdmin) && rfq.status === 'active' && (
            <button className="btn btn-outline" onClick={handleCloseAuction}>Close Auction</button>
          )}
          {(isBuyer || isAdmin) && rfq.status === 'closed' && bids.length > 0 && (
            <button className="btn btn-gold" onClick={handleAwardWinner}>🏆 Award Winner</button>
          )}
        </div>
      </div>

      {/* Countdown strip */}
      <div className="card" style={{
        padding: '20px 24px', marginBottom: 24,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
        borderColor: isUrgent ? 'rgba(239,68,68,0.4)' : isWarning ? 'rgba(249,115,22,0.3)' : 'var(--border)',
        background: isUrgent ? 'rgba(239,68,68,0.03)' : 'var(--bg-card)',
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Bid Closes In</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700,
            color: timeColor,
            animation: isUrgent ? 'countdownPulse 0.5s ease-in-out infinite' : 'none',
          }}>
            {isExpired ? 'CLOSED' : formatCountdown(countdown)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {rfq.currentCloseTime ? format(new Date(rfq.currentCloseTime), 'dd MMM, hh:mm a') : '—'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Forced Close</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: 'var(--accent-orange)' }}>
            {formatCountdown(forcedCountdown) || 'CLOSED'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {rfq.forcedBidCloseTime ? format(new Date(rfq.forcedBidCloseTime), 'dd MMM, hh:mm a') : '—'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Current L1 Bid</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: 'var(--accent-green)' }}>
            {l1Bid ? `₹${l1Bid.quote?.totalAmount?.toLocaleString()}` : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {l1Bid ? `${l1Bid.supplier?.name} · ${l1Bid.supplier?.company || ''}` : 'No bids yet'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Extensions</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: rfq.extensionCount > 0 ? 'var(--accent-orange)' : 'var(--text-primary)' }}>
            {rfq.extensionCount || 0}×
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Window: {rfq.auctionConfig?.triggerWindow}m · +{rfq.auctionConfig?.extensionDuration}m each
          </div>
        </div>
      </div>

      {/* My position panel — supplier only */}
      {isSupplier && myBid && (
        <div className="card" style={{
          padding: '16px 22px', marginBottom: 24,
          borderColor: myRank === 1 ? 'var(--gold-border)' : 'var(--border)',
          background: myRank === 1 ? 'var(--gold-bg)' : 'transparent',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Your Current Position</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 42,
                  color: myRank === 1 ? 'var(--gold)' : myRank === 2 ? '#9ca3af' : myRank === 3 ? '#b4783c' : 'var(--text-secondary)',
                  lineHeight: 1,
                }}>L{myRank}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>
                    ₹{myBid.quote?.totalAmount?.toLocaleString()}
                  </div>
                  {myBid.quote?.supplierNote && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>"{myBid.quote.supplierNote}"</div>
                  )}
                </div>
              </div>
            </div>
            {myRank === 1 ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36 }}>🏆</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', marginTop: 4 }}>Leading!</div>
              </div>
            ) : l1Bid && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Gap to L1</div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', fontWeight: 700, fontSize: 18 }}>
                  +₹{(myBid.quote?.totalAmount - l1Bid.quote?.totalAmount)?.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Beat L1 by bidding below ₹{l1Bid.quote?.totalAmount?.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, gap: 0 }}>
        {[
          { key: 'bids',     label: `All Bids (${bids.length})` },
          { key: 'details',  label: 'Item Details' },
          { key: 'activity', label: 'Activity Log' },
        ].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '10px 22px', background: 'none', border: 'none',
            borderBottom: activeTab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
            color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.03em', transition: 'var(--transition)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Bids tab */}
      {activeTab === 'bids' && (
        <div>
          {bids.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🏷</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No bids yet</div>
              <div style={{ fontSize: 14 }}>
                {isSupplier && rfq.status === 'active' && !isExpired
                  ? 'Be the first to place a bid!'
                  : 'Waiting for suppliers to bid.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bids.map((bid) => (
                <BidCard key={bid._id} bid={bid} isMe={bid.supplier?._id === user?._id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details tab */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Auction Item</div>
            {rfq.item?.image && (
              <img src={rfq.item.image} alt="item" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />
            )}
            {rfq.item?.name && <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{rfq.item.name}</div>}
            {rfq.item?.category && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>{getCategoryEmoji(rfq.item.category)}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{rfq.item.category}</span>
              </div>
            )}
            {rfq.item?.description && <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>{rfq.item.description}</p>}
            {rfq.item?.basePrice && (
              <div style={{ padding: '10px 14px', background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>RESERVE / BASE PRICE</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>₹{rfq.item.basePrice?.toLocaleString()}</div>
              </div>
            )}
            {rfq.item?.specifications?.filter((s) => s.key)?.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{s.key}</span>
                <span style={{ fontWeight: 500 }}>{s.value}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Auction Configuration</div>
            {[
              { label: 'Auction Type', value: 'British Auction (RFQ)' },
              { label: 'Round', value: `Round ${rfq.auctionConfig?.round || 1}` },
              { label: 'Trigger Window', value: `${rfq.auctionConfig?.triggerWindow} minutes` },
              { label: 'Extension Duration', value: `${rfq.auctionConfig?.extensionDuration} minutes` },
              { label: 'Extension Trigger', value: rfq.auctionConfig?.extensionTrigger?.replace(/_/g, ' ') },
              { label: 'Bid Start', value: rfq.bidStartTime ? format(new Date(rfq.bidStartTime), 'dd MMM yyyy, hh:mm a') : '—' },
              { label: 'Bid Close', value: rfq.bidCloseTime ? format(new Date(rfq.bidCloseTime), 'dd MMM yyyy, hh:mm a') : '—' },
              { label: 'Forced Close', value: rfq.forcedBidCloseTime ? format(new Date(rfq.forcedBidCloseTime), 'dd MMM yyyy, hh:mm a') : '—' },
              { label: 'Total Extensions', value: `${rfq.extensionCount || 0}×` },
              { label: 'Invited Suppliers', value: rfq.invitedSuppliers?.length || 0 },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{row.value}</span>
              </div>
            ))}

            {/* Winner display */}
            {rfq.status === 'awarded' && bids[0] && (
              <div style={{ marginTop: 20, padding: '16px', background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>🏆 Winning Bid</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{bids[0].supplier?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{bids[0].supplier?.company}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>
                  ₹{bids[0].quote?.totalAmount?.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Activity Log</div>
          {!rfq.activityLog?.length ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No activity yet.</div>
          ) : (
            rfq.activityLog.slice().reverse().map((entry, i) => {
              const dotColor = entry.type === 'time_extended' ? 'var(--accent-orange)'
                : entry.type === 'bid_placed' ? 'var(--accent-green)'
                : entry.type === 'auction_closed' ? 'var(--accent-red)'
                : 'var(--gold)';
              return (
                <div key={i} className="feed-item">
                  <div className="feed-dot" style={{ background: dotColor, flexShrink: 0 }} />
                  <div className="feed-content">
                    <div style={{ fontSize: 14 }}>{entry.message}</div>
                    <div className="feed-meta">
                      {entry.triggeredBy?.name && <span>{entry.triggeredBy.name} · </span>}
                      {entry.timestamp ? format(new Date(entry.timestamp), 'dd MMM, hh:mm:ss a') : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Bid Form Modal ── */}
      {showBidForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowBidForm(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-accent" />
              <h2 className="modal-title">Place Your Bid</h2>
            </div>

            {/* Context */}
            <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{rfq.item?.name || rfq.rfqName}</div>
              <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Current L1: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', fontWeight: 700 }}>
                    {l1Bid ? `₹${l1Bid.quote?.totalAmount?.toLocaleString()}` : 'No bids — be first!'}
                  </span>
                </div>
                {rfq.item?.basePrice && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Base: </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>₹{rfq.item.basePrice?.toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--accent-orange)' }}>
                ⏱ Closes in: {isExpired ? 'CLOSED' : formatCountdown(countdown)}
              </div>
            </div>

            {/* Bid amount — primary field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="label">Your Bid Amount (₹) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--gold)', fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-mono)',
                  }}>₹</span>
                  <input
                    type="number"
                    className="input"
                    placeholder={l1Bid ? (l1Bid.quote?.totalAmount - 1).toString() : '500000'}
                    value={bidForm.bidAmount}
                    onChange={(e) => setBidForm((f) => ({ ...f, bidAmount: e.target.value }))}
                    style={{ paddingLeft: 30, fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                    onKeyDown={(e) => e.key === 'Enter' && handlePlaceBid()}
                    autoFocus
                  />
                </div>
                {l1Bid && (
                  <div className="help-text" style={{ color: bidForm.bidAmount && Number(bidForm.bidAmount) < l1Bid.quote?.totalAmount ? 'var(--accent-green)' : bidForm.bidAmount ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                    {bidForm.bidAmount
                      ? Number(bidForm.bidAmount) < l1Bid.quote?.totalAmount
                        ? `✓ Valid — ₹${(l1Bid.quote.totalAmount - Number(bidForm.bidAmount)).toLocaleString()} below L1`
                        : `✗ Must be below ₹${l1Bid.quote?.totalAmount?.toLocaleString()}`
                      : `Must be below current L1 of ₹${l1Bid.quote?.totalAmount?.toLocaleString()}`
                    }
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="label">Note (Optional)</label>
                <input
                  className="input"
                  placeholder="e.g. includes insurance, delivery in 3 days..."
                  value={bidForm.supplierNote}
                  onChange={(e) => setBidForm((f) => ({ ...f, supplierNote: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="label">Quote Valid Until</label>
                <input
                  type="date"
                  className="input"
                  value={bidForm.quoteValidity}
                  onChange={(e) => setBidForm((f) => ({ ...f, quoteValidity: e.target.value }))}
                />
              </div>

              {/* Preview */}
              {bidForm.bidAmount && Number(bidForm.bidAmount) > 0 && (
                <div style={{
                  padding: '14px 18px',
                  background: Number(bidForm.bidAmount) < (l1Bid?.quote?.totalAmount || Infinity) ? 'var(--gold-bg)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${Number(bidForm.bidAmount) < (l1Bid?.quote?.totalAmount || Infinity) ? 'var(--gold-border)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: 10,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>YOUR BID</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800,
                      color: Number(bidForm.bidAmount) < (l1Bid?.quote?.totalAmount || Infinity) ? 'var(--gold)' : 'var(--accent-red)',
                    }}>₹{Number(bidForm.bidAmount).toLocaleString()}</div>
                  </div>
                  {l1Bid && Number(bidForm.bidAmount) < l1Bid.quote?.totalAmount && (
                    <div style={{ textAlign: 'right', color: 'var(--accent-green)', fontSize: 13, fontWeight: 600 }}>
                      Would be L1 🏆
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                <button className="btn btn-outline btn-lg" onClick={() => setShowBidForm(false)}>Cancel</button>
                <button
                  className="btn btn-gold btn-lg"
                  onClick={handlePlaceBid}
                  disabled={submitting || !bidForm.bidAmount || Number(bidForm.bidAmount) <= 0}
                >
                  {submitting ? <><span className="spinner" /> Submitting...</> : 'Submit Bid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BidCard({ bid, isMe }) {
  const rankColors = { 1: 'var(--gold)', 2: '#9ca3af', 3: '#b4783c' };
  const rankBg     = { 1: 'var(--gold-bg)', 2: 'rgba(156,163,175,0.08)', 3: 'rgba(180,120,60,0.08)' };
  const isTopThree = bid.rank <= 3;

  return (
    <div className="card" style={{
      padding: '16px 22px',
      borderColor: isMe ? 'var(--gold-border)' : isTopThree ? `rgba(${bid.rank===1?'212,160,23':bid.rank===2?'156,163,175':'180,120,60'},0.25)` : 'var(--border)',
      background: isMe ? 'rgba(212,160,23,0.03)' : 'var(--bg-card)',
      transition: 'var(--transition)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Rank badge */}
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: rankBg[bid.rank] || 'var(--bg-secondary)',
            border: `2px solid ${rankColors[bid.rank] || 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 20,
            color: rankColors[bid.rank] || 'var(--text-muted)',
            flexShrink: 0,
          }}>
            {bid.rank <= 3 ? `L${bid.rank}` : bid.rank}
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {bid.supplier?.name || 'Supplier'}
              {isMe && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>(you)</span>}
              {bid.changedL1 && <span style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px', background: 'rgba(212,160,23,0.15)', color: 'var(--gold)', borderRadius: 4, fontWeight: 700 }}>NEW L1</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {bid.supplier?.company}
              {bid.quote?.supplierNote && <span style={{ color: 'var(--text-muted)' }}> · "{bid.quote.supplierNote}"</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {bid.placedAt ? format(new Date(bid.placedAt), 'dd MMM, hh:mm:ss a') : ''}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800,
            color: rankColors[bid.rank] || 'var(--text-primary)',
          }}>₹{bid.quote?.totalAmount?.toLocaleString()}</div>
          {bid.quote?.quoteValidity && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Valid till {format(new Date(bid.quote.quoteValidity), 'dd MMM yyyy')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { active: 'badge-active', closed: 'badge-closed', force_closed: 'badge-force', draft: 'badge-draft', awarded: 'badge-gold' };
  return <span className={`badge ${map[status] || 'badge-draft'}`}>{status?.replace(/_/g, ' ').toUpperCase()}</span>;
}

function getCategoryEmoji(cat) {
  const map = {
    'Paintings': '🎨', 'Artifacts': '🗿', 'Books': '📚', 'Antiques': '🏺',
    'Manuscripts': '📜', 'Jewelry': '💎', 'Coins': '🪙', 'Ceramics': '🏛️',
    'Sculptures': '🗽', 'Textiles': '🧵', 'Stamps': '📫', 'Watches': '⌚',
    'Furniture': '🪑', 'Photographs': '📷', 'Maps': '🗺️',
  };
  return map[cat] || '🏷';
}
