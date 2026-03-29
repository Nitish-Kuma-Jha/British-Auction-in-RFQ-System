const Bid = require('../models/Bid');
const RFQ  = require('../models/RFQ');

// POST /api/bids/place
exports.placeBid = async (req, res) => {
  try {
    const { rfqId, quote } = req.body;

    if (!rfqId || !quote?.bidAmount) {
      return res.status(400).json({ success: false, message: 'rfqId and bidAmount are required' });
    }

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });

    const now = new Date();

    if (now < rfq.bidStartTime) {
      return res.status(400).json({ success: false, message: 'Auction has not started yet' });
    }
    if (now > rfq.forcedBidCloseTime) {
      return res.status(400).json({ success: false, message: 'Auction has been force closed — no more bids accepted' });
    }
    if (now > rfq.currentCloseTime) {
      return res.status(400).json({ success: false, message: 'Auction is closed' });
    }
    if (rfq.status !== 'active') {
      return res.status(400).json({ success: false, message: `Auction is ${rfq.status}, not active` });
    }

    const bidAmount = Number(quote.bidAmount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid bid amount' });
    }

    // Capture current L1 before this bid
    const prevL1 = await Bid.findOne({ rfq: rfqId, isValid: true }).sort({ 'quote.totalAmount': 1 });
    const prevL1Amount   = prevL1?.quote?.totalAmount;
    const prevL1Supplier = prevL1?.supplier?.toString();

    // Validate: in a British auction suppliers lower prices, so bid must be below current L1
    // (unless there are no bids yet, or they're the current L1 improving their own bid)
    if (prevL1 && prevL1Supplier !== req.user._id.toString() && bidAmount >= prevL1Amount) {
      return res.status(400).json({
        success: false,
        message: `Your bid ₹${bidAmount.toLocaleString()} must be lower than the current L1 bid ₹${prevL1Amount.toLocaleString()}`,
      });
    }

    // Create the bid
    const bid = await Bid.create({
      rfq: rfqId,
      supplier: req.user._id,
      quote: {
        bidAmount,
        totalAmount: bidAmount,
        supplierNote: quote.supplierNote || '',
        transitTime:  quote.transitTime  || '',
        quoteValidity: quote.quoteValidity || undefined,
        remarks:       quote.remarks || '',
      },
    });

    // Re-rank all bids
    const allBids = await Bid.find({ rfq: rfqId, isValid: true })
      .sort({ 'quote.totalAmount': 1 })
      .populate('supplier', 'name company');

    const rankedBids = await Promise.all(allBids.map(async (b, i) => {
      b.rankAtTime = i + 1;
      await b.save();
      return { ...b.toObject(), rank: i + 1, rankLabel: `L${i + 1}` };
    }));

    // Detect rank/L1 changes
    const newL1 = allBids[0];
    const changedL1   = newL1?._id.toString() === bid._id.toString();
    const changedRank = changedL1 && !!prevL1 && prevL1Supplier !== req.user._id.toString();

    bid.changedL1   = changedL1;
    bid.changedRank = changedRank;
    await bid.save();

    // British Auction extension check
    const extensionResult = await checkAndExtendAuction(rfq, bid, now, changedL1, changedRank, req.user);

    // Log bid in RFQ
    const logEntry = {
      type: 'bid_placed',
      message: `${req.user.name} (${req.user.company || 'Supplier'}) placed a bid of ₹${bidAmount.toLocaleString()}`,
      triggeredBy: req.user._id,
      metadata: { bidId: bid._id, totalAmount: bidAmount, rank: rankedBids.findIndex((b) => b._id.toString() === bid._id.toString()) + 1 },
    };

    await RFQ.findByIdAndUpdate(rfqId, {
      $push: { activityLog: logEntry },
      currentL1BidId: allBids[0]?._id,
    });

    const payload = {
      bid: { ...bid.toObject(), rank: rankedBids.findIndex((b) => b._id.toString() === bid._id.toString()) + 1 },
      allBids: rankedBids,
      rfqId,
      extensionResult,
    };

    req.io?.to(rfqId).emit('bid:new', payload);
    res.status(201).json({ success: true, bid: payload.bid, extensionResult });

  } catch (err) {
    console.error('placeBid error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Core British Auction Extension Logic
async function checkAndExtendAuction(rfq, bid, now, changedL1, changedRank, user) {
  const { triggerWindow, extensionDuration, extensionTrigger } = rfq.auctionConfig;
  const triggerWindowMs = triggerWindow * 60 * 1000;
  const extensionMs     = extensionDuration * 60 * 1000;

  const windowStart = new Date(rfq.currentCloseTime.getTime() - triggerWindowMs);
  const isInWindow  = now >= windowStart && now <= rfq.currentCloseTime;

  if (!isInWindow) return null;

  let shouldExtend = false;
  let reason = '';

  if (extensionTrigger === 'bid_received') {
    shouldExtend = true;
    reason = `Bid received in last ${triggerWindow} min`;
  } else if (extensionTrigger === 'rank_change') {
    shouldExtend = changedRank || changedL1;
    reason = 'Rank change in trigger window';
  } else if (extensionTrigger === 'l1_change') {
    shouldExtend = changedL1;
    reason = 'L1 (lowest bidder) changed';
  }

  if (!shouldExtend) return null;

  let newCloseTime = new Date(rfq.currentCloseTime.getTime() + extensionMs);
  if (newCloseTime > rfq.forcedBidCloseTime) newCloseTime = rfq.forcedBidCloseTime;
  if (newCloseTime <= rfq.currentCloseTime) return null;

  const extensionEntry = {
    type: 'time_extended',
    message: `⏱ Auction extended by ${extensionDuration} min — ${reason}`,
    triggeredBy: user._id,
    metadata: {
      previousCloseTime: rfq.currentCloseTime,
      newCloseTime,
      reason,
      extensionNumber: rfq.extensionCount + 1,
    },
  };

  await RFQ.findByIdAndUpdate(rfq._id, {
    currentCloseTime: newCloseTime,
    $inc: { extensionCount: 1 },
    $push: { activityLog: extensionEntry },
  });

  return {
    extended: true,
    newCloseTime,
    reason,
    extensionDuration,
    extensionNumber: rfq.extensionCount + 1,
  };
}

// GET /api/bids/:rfqId
exports.getBidsByRFQ = async (req, res) => {
  try {
    const bids = await Bid.find({ rfq: req.params.rfqId, isValid: true })
      .populate('supplier', 'name company')
      .sort({ 'quote.totalAmount': 1 });

    const rankedBids = bids.map((b, i) => ({
      ...b.toObject(),
      rank: i + 1,
      rankLabel: `L${i + 1}`,
    }));

    res.json({ success: true, bids: rankedBids });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bids/my/:rfqId
exports.getMyBids = async (req, res) => {
  try {
    const bids = await Bid.find({ rfq: req.params.rfqId, supplier: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, bids });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
