const RFQ = require('../models/RFQ');
const Bid = require('../models/Bid');

// POST /api/rfq/create
exports.createRFQ = async (req, res) => {
  try {
    const {
      rfqName, bidStartTime, bidCloseTime, forcedBidCloseTime,
      pickupServiceDate, auctionConfig, item, invitedSuppliers,
    } = req.body;

    if (new Date(forcedBidCloseTime) <= new Date(bidCloseTime)) {
      return res.status(400).json({
        success: false,
        message: 'Forced Close Time must be after Bid Close Time',
      });
    }

    const rfq = await RFQ.create({
      rfqName,
      buyer: req.user._id,
      status: 'active',
      bidStartTime,
      bidCloseTime,
      forcedBidCloseTime,
      currentCloseTime: bidCloseTime,
      pickupServiceDate,
      auctionConfig,
      item,
      invitedSuppliers: invitedSuppliers?.map((s) => ({ supplier: s })) || [],
      activityLog: [{
        type: 'auction_started',
        message: `RFQ "${rfqName}" created`,
        triggeredBy: req.user._id,
      }],
    });

    // Emit to connected clients
    req.io?.emit('rfq:created', { rfqId: rfq._id, rfqName: rfq.rfqName });

    res.status(201).json({ success: true, rfq });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rfq/list
exports.listRFQs = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    // Buyers & admins see all RFQs; suppliers see active auctions or ones they're invited to
    if (req.user.role === 'buyer') {
      query.buyer = req.user._id;
    } else if (req.user.role === 'supplier') {
      // Show active auctions + any they have been explicitly invited to
      query.$or = [
        { status: 'active' },
        { 'invitedSuppliers.supplier': req.user._id },
      ];
    }

    const rfqs = await RFQ.find(query)
      .populate('buyer', 'name company')
      .select('-activityLog -invitedSuppliers')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Attach lowest bid to each RFQ
    const enriched = await Promise.all(
      rfqs.map(async (rfq) => {
        const lowestBid = await Bid.findOne({ rfq: rfq._id, isValid: true })
          .sort({ 'quote.totalAmount': 1 })
          .select('quote.totalAmount supplier')
          .populate('supplier', 'name company');
        return { ...rfq.toObject(), lowestBid };
      })
    );

    const total = await RFQ.countDocuments(query);
    res.json({ success: true, rfqs: enriched, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rfq/:id
exports.getRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findById(req.params.id)
      .populate('buyer', 'name company email')
      .populate('activityLog.triggeredBy', 'name');

    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });

    // Get all bids sorted by total amount
    const bids = await Bid.find({ rfq: rfq._id, isValid: true })
      .populate('supplier', 'name company')
      .sort({ 'quote.totalAmount': 1 });

    // Assign rankings
    const rankedBids = bids.map((bid, i) => ({
      ...bid.toObject(),
      rank: i + 1,
      rankLabel: `L${i + 1}`,
    }));

    res.json({ success: true, rfq, bids: rankedBids });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/rfq/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });
    if (rfq.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    rfq.status = status;
    await rfq.save();
    req.io?.to(rfq._id.toString()).emit('rfq:statusChanged', { rfqId: rfq._id, status });
    res.json({ success: true, rfq });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rfq/:id/activity
exports.getActivityLog = async (req, res) => {
  try {
    const rfq = await RFQ.findById(req.params.id)
      .select('activityLog')
      .populate('activityLog.triggeredBy', 'name');
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });
    res.json({ success: true, activityLog: rfq.activityLog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
