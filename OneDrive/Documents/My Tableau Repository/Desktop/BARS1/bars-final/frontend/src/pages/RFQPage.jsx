import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { rfqAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Paintings', 'Artifacts', 'Books', 'Antiques', 'Manuscripts',
  'Jewelry', 'Coins', 'Ceramics', 'Sculptures', 'Textiles',
  'Stamps', 'Watches', 'Furniture', 'Photographs', 'Maps', 'Other',
];

const TRIGGER_OPTIONS = [
  { value: 'bid_received', label: 'Any bid in last X minutes' },
  { value: 'rank_change',  label: 'Any rank change in last X minutes' },
  { value: 'l1_change',   label: 'L1 (lowest bidder) change only' },
];

/* ─────────── Blank item template ─────────── */
const blankItem = () => ({
  id: Math.random().toString(36).slice(2),
  name: '', category: '', description: '', basePrice: '',
  image: '',
  specs: [{ key: '', value: '' }],
});

/* ─────────── Blank round template ─────────── */
const blankRound = (roundNum) => ({
  roundNum,
  triggerWindow: 10,
  extensionDuration: 5,
  extensionTrigger: 'bid_received',
  bidStartTime: '',
  bidCloseTime: '',
  forcedBidCloseTime: '',
  pickupServiceDate: '',
  items: [blankItem()],
});

export default function RFQPage() {
  const [view, setView]     = useState('list');
  const [rfqs, setRfqs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]  = useState('all');
  const { isBuyer, isAdmin, isSupplier } = useAuth();
  const navigate = useNavigate();

  const loadRfqs = useCallback(() => {
    setLoading(true);
    rfqAPI.list().then(({ data }) => {
      setRfqs(data.rfqs || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadRfqs(); }, [loadRfqs]);

  if (view === 'create') {
    return (
      <CreateRFQWizard
        onBack={() => setView('list')}
        onCreated={(rfq) => { loadRfqs(); navigate(`/rfq/${rfq._id}`); }}
      />
    );
  }

  const filtered = filter === 'all' ? rfqs : rfqs.filter((r) => r.status === filter);
  const stats = {
    total:  rfqs.length,
    active: rfqs.filter((r) => r.status === 'active').length,
    closed: rfqs.filter((r) => ['closed', 'force_closed'].includes(r.status)).length,
    awarded: rfqs.filter((r) => r.status === 'awarded').length,
  };

  return (
    <div className="page-container" style={{ paddingTop: 28, paddingBottom: 56 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>RFQ Auctions</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>British Auction–style bidding — live rankings, auto time extensions, forced close</p>
        </div>
        {(isBuyer || isAdmin) && (
          <button className="btn btn-gold" onClick={() => setView('create')}>
            + Create RFQ Auction
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total RFQs', value: stats.total,  color: 'var(--text-primary)' },
          { label: 'Live',       value: stats.active, color: 'var(--accent-green)' },
          { label: 'Completed',  value: stats.closed, color: 'var(--text-secondary)' },
          { label: 'Awarded',    value: stats.awarded,color: 'var(--gold)' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 30, fontFamily: 'var(--font-display)', color: s.color, letterSpacing: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[['all','All'], ['active','Live'], ['closed','Closed'], ['awarded','Awarded'], ['draft','Draft']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: '6px 16px', border: '1px solid',
              borderColor: filter === val ? 'var(--gold)' : 'var(--border)',
              borderRadius: 100, background: filter === val ? 'var(--gold-bg)' : 'transparent',
              color: filter === val ? 'var(--gold)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'all 0.18s',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 56, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏺</div>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>No auctions found</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {(isBuyer || isAdmin) ? 'Create your first RFQ auction to get started.' : 'No auctions available right now.'}
            </div>
          </div>
        ) : (
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Auction</th>
                  <th>Round</th>
                  <th>Status</th>
                  <th>Config</th>
                  <th>L1 Bid</th>
                  <th>Closes</th>
                  <th>Forced Close</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rfq) => (
                  <RFQRow key={rfq._id} rfq={rfq} onClick={() => navigate(`/rfq/${rfq._id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RFQRow({ rfq, onClick }) {
  return (
    <tr style={{ cursor: 'pointer' }} onClick={onClick}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{getCategoryEmoji(rfq.item?.category)}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{rfq.rfqName?.replace(/^\[R\d+\] /, '')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{rfq.referenceId}</div>
          </div>
        </div>
      </td>
      <td>
        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
          background: 'rgba(212,160,23,0.12)', color: 'var(--gold)',
        }}>R{rfq.auctionConfig?.round || 1}</span>
      </td>
      <td><StatusBadge status={rfq.status} /></td>
      <td>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Window: <span style={{ color: 'var(--gold)' }}>{rfq.auctionConfig?.triggerWindow}m</span>
          {' · '}
          Ext: <span style={{ color: 'var(--gold)' }}>{rfq.auctionConfig?.extensionDuration}m</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>
          {rfq.auctionConfig?.extensionTrigger?.replace(/_/g, ' ')}
        </div>
      </td>
      <td>
        {rfq.lowestBid ? (
          <div>
            <div style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ₹{rfq.lowestBid.quote?.totalAmount?.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rfq.lowestBid.supplier?.name}</div>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No bids yet</span>}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {rfq.currentCloseTime ? format(new Date(rfq.currentCloseTime), 'dd MMM, hh:mm a') : '—'}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {rfq.forcedBidCloseTime ? format(new Date(rfq.forcedBidCloseTime), 'dd MMM, hh:mm a') : '—'}
      </td>
      <td>
        <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); }}>View →</button>
      </td>
    </tr>
  );
}

/* ══════════════════════════════════════════════
   CREATE RFQ WIZARD — multi-round, multi-item
══════════════════════════════════════════════ */
function CreateRFQWizard({ onBack, onCreated }) {
  const [step, setStep]       = useState(1); // 1 = rounds setup, 2 = review & submit
  const [rfqName, setRfqName] = useState('');
  const [rounds, setRounds]   = useState([blankRound(1)]);
  const [loading, setLoading] = useState(false);

  /* ── Round helpers ── */
  const addRound = () => {
    if (rounds.length >= 5) { toast.error('Maximum 5 rounds'); return; }
    setRounds((r) => [...r, blankRound(r.length + 1)]);
  };

  const removeRound = (idx) => {
    if (rounds.length === 1) { toast.error('At least one round is required'); return; }
    setRounds((r) => r.filter((_, i) => i !== idx).map((r, i) => ({ ...r, roundNum: i + 1 })));
  };

  const updateRound = (idx, key, val) =>
    setRounds((r) => r.map((round, i) => i === idx ? { ...round, [key]: val } : round));

  /* ── Item helpers ── */
  const addItem = (rIdx) => {
    setRounds((r) => r.map((round, i) =>
      i === rIdx ? { ...round, items: [...round.items, blankItem()] } : round
    ));
  };

  const removeItem = (rIdx, itemId) => {
    setRounds((r) => r.map((round, i) => {
      if (i !== rIdx) return round;
      if (round.items.length === 1) { toast.error('Each round needs at least one item'); return round; }
      return { ...round, items: round.items.filter((it) => it.id !== itemId) };
    }));
  };

  const updateItem = (rIdx, itemId, key, val) =>
    setRounds((r) => r.map((round, i) =>
      i !== rIdx ? round : {
        ...round,
        items: round.items.map((it) => it.id === itemId ? { ...it, [key]: val } : it),
      }
    ));

  const addSpec = (rIdx, itemId) =>
    setRounds((r) => r.map((round, i) =>
      i !== rIdx ? round : {
        ...round,
        items: round.items.map((it) =>
          it.id !== itemId ? it : { ...it, specs: [...it.specs, { key: '', value: '' }] }
        ),
      }
    ));

  const updateSpec = (rIdx, itemId, specIdx, field, val) =>
    setRounds((r) => r.map((round, i) =>
      i !== rIdx ? round : {
        ...round,
        items: round.items.map((it) =>
          it.id !== itemId ? it : {
            ...it,
            specs: it.specs.map((s, si) => si === specIdx ? { ...s, [field]: val } : s),
          }
        ),
      }
    ));

  const removeSpec = (rIdx, itemId, specIdx) =>
    setRounds((r) => r.map((round, i) =>
      i !== rIdx ? round : {
        ...round,
        items: round.items.map((it) =>
          it.id !== itemId ? it : { ...it, specs: it.specs.filter((_, si) => si !== specIdx) }
        ),
      }
    ));

  /* ── Image upload ── */
  const handleImageUpload = (rIdx, itemId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateItem(rIdx, itemId, 'image', ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── Validate ── */
  const validate = () => {
    if (!rfqName.trim()) { toast.error('Auction name is required'); return false; }
    for (const [ri, round] of rounds.entries()) {
      if (!round.bidStartTime)       { toast.error(`Round ${ri+1}: Bid start time required`); return false; }
      if (!round.bidCloseTime)       { toast.error(`Round ${ri+1}: Bid close time required`); return false; }
      if (!round.forcedBidCloseTime) { toast.error(`Round ${ri+1}: Forced close time required`); return false; }
      if (new Date(round.forcedBidCloseTime) <= new Date(round.bidCloseTime)) {
        toast.error(`Round ${ri+1}: Forced close must be after bid close time`); return false;
      }
      for (const [ii, item] of round.items.entries()) {
        if (!item.name.trim()) { toast.error(`Round ${ri+1}, Item ${ii+1}: Name is required`); return false; }
      }
    }
    return true;
  };

  /* ── Submit — one RFQ per item per round ── */
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    let lastCreated = null;
    let totalCreated = 0;
    try {
      for (const round of rounds) {
        for (const item of round.items) {
          const payload = {
            rfqName: `[R${round.roundNum}] ${item.name || rfqName}`,
            bidStartTime: round.bidStartTime,
            bidCloseTime: round.bidCloseTime,
            forcedBidCloseTime: round.forcedBidCloseTime,
            pickupServiceDate: round.pickupServiceDate || undefined,
            auctionConfig: {
              triggerWindow: Number(round.triggerWindow),
              extensionDuration: Number(round.extensionDuration),
              extensionTrigger: round.extensionTrigger,
              isBritishAuction: true,
              round: round.roundNum,
            },
            item: {
              name: item.name,
              description: item.description,
              basePrice: Number(item.basePrice) || undefined,
              category: item.category,
              image: item.image || undefined,
              specifications: item.specs.filter((s) => s.key.trim()),
            },
          };
          const { data } = await rfqAPI.create(payload);
          lastCreated = data.rfq;
          totalCreated++;
        }
      }
      toast.success(`${totalCreated} auction${totalCreated > 1 ? 's' : ''} created across ${rounds.length} round${rounds.length > 1 ? 's' : ''}!`);
      onCreated(lastCreated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create auctions');
    } finally { setLoading(false); }
  };

  const now = new Date();
  const df = (offsetMin, base) => {
    const d = base ? new Date(base) : new Date(now.getTime() + offsetMin * 60000);
    return d.toISOString().slice(0, 16);
  };

  const totalItems = rounds.reduce((s, r) => s + r.items.length, 0);

  return (
    <div className="page-container" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 900 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Create British Auction RFQ</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
            {rounds.length} round{rounds.length > 1 ? 's' : ''} · {totalItems} item{totalItems !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Auction name */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Auction Details</div>
        <div className="form-group">
          <label className="label">Auction Name / Reference *</label>
          <input
            className="input"
            placeholder="e.g. Heritage Collectibles Auction — March 2026"
            value={rfqName}
            onChange={(e) => setRfqName(e.target.value)}
          />
          <div className="help-text">This name prefixes all items created. E.g. "[R1] Mughal Painting"</div>
        </div>
      </div>

      {/* Rounds */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {rounds.map((round, rIdx) => (
          <RoundPanel
            key={rIdx}
            round={round}
            rIdx={rIdx}
            canRemove={rounds.length > 1}
            onRemove={() => removeRound(rIdx)}
            onUpdate={(k, v) => updateRound(rIdx, k, v)}
            onAddItem={() => addItem(rIdx)}
            onRemoveItem={(id) => removeItem(rIdx, id)}
            onUpdateItem={(id, k, v) => updateItem(rIdx, id, k, v)}
            onAddSpec={(id) => addSpec(rIdx, id)}
            onUpdateSpec={(id, si, f, v) => updateSpec(rIdx, id, si, f, v)}
            onRemoveSpec={(id, si) => removeSpec(rIdx, id, si)}
            onImageUpload={(id, e) => handleImageUpload(rIdx, id, e)}
            df={df}
          />
        ))}
      </div>

      {/* Add round */}
      {rounds.length < 5 && (
        <button
          className="btn btn-outline"
          onClick={addRound}
          style={{ marginTop: 20, width: '100%', borderStyle: 'dashed', padding: 16 }}
        >
          + Add Round {rounds.length + 1}
        </button>
      )}

      {/* Submit */}
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button className="btn btn-outline btn-lg" onClick={onBack} style={{ minWidth: 120 }}>Cancel</button>
        <button
          className="btn btn-gold btn-lg"
          onClick={handleSubmit}
          disabled={loading}
          style={{ flex: 1 }}
        >
          {loading
            ? <><span className="spinner" /> Creating {totalItems} auction{totalItems !== 1 ? 's' : ''}...</>
            : `Create ${totalItems} Auction${totalItems !== 1 ? 's' : ''} across ${rounds.length} Round${rounds.length !== 1 ? 's' : ''}`
          }
        </button>
      </div>
    </div>
  );
}

function RoundPanel({ round, rIdx, canRemove, onRemove, onUpdate, onAddItem, onRemoveItem, onUpdateItem, onAddSpec, onUpdateSpec, onRemoveSpec, onImageUpload, df }) {
  const now = new Date();
  const defaultStart  = df(5);
  const defaultClose  = df(125);
  const defaultForced = df(185);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Round header */}
      <div style={{
        padding: '14px 22px', background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--gold)', color: '#000',
            fontFamily: 'var(--font-display)', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>R{round.roundNum}</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Round {round.roundNum}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>· {round.items.length} item{round.items.length !== 1 ? 's' : ''}</span>
        </div>
        {canRemove && (
          <button className="btn btn-danger btn-sm" onClick={onRemove}>Remove Round</button>
        )}
      </div>

      <div style={{ padding: '20px 22px', background: 'var(--bg-secondary)' }}>
        {/* Timing */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Auction Timing</div>
          <div className="form-row-3" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="label">Bid Start *</label>
              <input type="datetime-local" className="input" defaultValue={defaultStart}
                value={round.bidStartTime} onChange={(e) => onUpdate('bidStartTime', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Bid Close *</label>
              <input type="datetime-local" className="input" defaultValue={defaultClose}
                value={round.bidCloseTime} onChange={(e) => onUpdate('bidCloseTime', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Forced Close *</label>
              <input type="datetime-local" className="input" defaultValue={defaultForced}
                value={round.forcedBidCloseTime} onChange={(e) => onUpdate('forcedBidCloseTime', e.target.value)} />
              <div className="help-text">Must be after Bid Close</div>
            </div>
          </div>
        </div>

        {/* British Auction Config */}
        <div style={{
          marginBottom: 20, padding: '16px 18px',
          background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>⚡ British Auction Configuration</div>
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="label">Trigger Window (X min)</label>
              <input type="number" className="input" min="1" max="60"
                value={round.triggerWindow} onChange={(e) => onUpdate('triggerWindow', e.target.value)} />
              <div className="help-text">Monitor last X min for activity</div>
            </div>
            <div className="form-group">
              <label className="label">Extension Duration (Y min)</label>
              <input type="number" className="input" min="1" max="60"
                value={round.extensionDuration} onChange={(e) => onUpdate('extensionDuration', e.target.value)} />
              <div className="help-text">Add Y minutes when triggered</div>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Extension Trigger</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {TRIGGER_OPTIONS.map((opt) => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '9px 14px', border: '1px solid',
                  borderColor: round.extensionTrigger === opt.value ? 'var(--gold)' : 'var(--border)',
                  borderRadius: 8, background: round.extensionTrigger === opt.value ? 'rgba(212,160,23,0.1)' : 'var(--bg-card)',
                  transition: 'all 0.18s',
                }}>
                  <input type="radio" name={`trigger-r${rIdx}`} value={opt.value}
                    checked={round.extensionTrigger === opt.value}
                    onChange={(e) => onUpdate('extensionTrigger', e.target.value)}
                    style={{ accentColor: 'var(--gold)' }} />
                  <span style={{
                    fontSize: 13,
                    fontWeight: round.extensionTrigger === opt.value ? 600 : 400,
                    color: round.extensionTrigger === opt.value ? 'var(--gold)' : 'var(--text-primary)',
                  }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            Auction Items — {round.items.length} item{round.items.length !== 1 ? 's' : ''} in this round
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {round.items.map((item, iIdx) => (
              <ItemPanel
                key={item.id}
                item={item}
                iIdx={iIdx}
                canRemove={round.items.length > 1}
                onRemove={() => onRemoveItem(item.id)}
                onUpdate={(k, v) => onUpdateItem(item.id, k, v)}
                onAddSpec={() => onAddSpec(item.id)}
                onUpdateSpec={(si, f, v) => onUpdateSpec(item.id, si, f, v)}
                onRemoveSpec={(si) => onRemoveSpec(item.id, si)}
                onImageUpload={(e) => onImageUpload(item.id, e)}
              />
            ))}
          </div>
          <button
            className="btn btn-outline"
            onClick={onAddItem}
            style={{ marginTop: 12, width: '100%', borderStyle: 'dashed' }}
          >
            + Add Item to Round {round.roundNum}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemPanel({ item, iIdx, canRemove, onRemove, onUpdate, onAddSpec, onUpdateSpec, onRemoveSpec, onImageUpload }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
      {/* Item header */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Item {iIdx + 1}</span>
        {canRemove && (
          <button
            onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: 12, fontFamily: 'var(--font-body)' }}
          >Remove ✕</button>
        )}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Image */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {item.image ? (
            <img src={item.image} alt="item"
              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: 8, border: '1px dashed var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
            }}>📷</div>
          )}
          <label style={{ cursor: 'pointer' }}>
            <div className="btn btn-outline btn-sm">{item.image ? 'Change Image' : 'Upload Image'}</div>
            <input type="file" accept="image/*" onChange={onImageUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Name + Category */}
        <div className="form-row">
          <div className="form-group">
            <label className="label">Item Name *</label>
            <input className="input" placeholder="e.g. Mughal Miniature Painting" value={item.name} onChange={(e) => onUpdate('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Category</label>
            <select className="input select" value={item.category} onChange={(e) => onUpdate('category', e.target.value)}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Description + Base Price */}
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Description</label>
            <textarea className="input" rows={2} placeholder="Provenance, condition, dimensions, era..." value={item.description} onChange={(e) => onUpdate('description', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div className="form-group" style={{ maxWidth: 220 }}>
          <label className="label">Reserve / Base Price (₹)</label>
          <input type="number" className="input" placeholder="500000" value={item.basePrice} onChange={(e) => onUpdate('basePrice', e.target.value)} />
        </div>

        {/* Specifications */}
        {item.specs.length > 0 && (
          <div>
            <label className="label" style={{ marginBottom: 8 }}>Specifications</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {item.specs.map((spec, si) => (
                <div key={si} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input" placeholder="Key (e.g. Era)" value={spec.key} onChange={(e) => onUpdateSpec(si, 'key', e.target.value)} style={{ flex: 1 }} />
                  <input className="input" placeholder="Value (e.g. 17th Century)" value={spec.value} onChange={(e) => onUpdateSpec(si, 'value', e.target.value)} style={{ flex: 2 }} />
                  <button onClick={() => onRemoveSpec(si)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onAddSpec} style={{ alignSelf: 'flex-start' }}>+ Add Specification</button>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
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
