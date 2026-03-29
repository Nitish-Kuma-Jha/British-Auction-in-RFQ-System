const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema(
  {
    rfqName: { type: String, required: true, trim: true },
    referenceId: {
      type: String,
      unique: true,
      default: () => 'RFQ-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },

    // Auction timeline
    bidStartTime: { type: Date, required: true },
    bidCloseTime: { type: Date, required: true },
    forcedBidCloseTime: { type: Date, required: true },
    pickupServiceDate: { type: Date },

    // Current effective close time (changes with extensions)
    currentCloseTime: { type: Date },

    // British Auction configuration (embedded)
    auctionConfig: {
      triggerWindow: { type: Number, default: 10, min: 1 }, // X minutes
      extensionDuration: { type: Number, default: 5, min: 1 }, // Y minutes
      extensionTrigger: {
        type: String,
        enum: ['bid_received', 'rank_change', 'l1_change'],
        default: 'bid_received',
      },
      isBritishAuction: { type: Boolean, default: true },
      round: { type: Number, default: 1, min: 1 },
    },

    // Auction item (embedded)
    item: {
      name: { type: String },
      description: { type: String },
      image: { type: String }, // base64 or URL
      basePrice: { type: Number },
      category: { type: String },
      specifications: [{ key: String, value: String }],
    },

    // Invited suppliers
    invitedSuppliers: [
      {
        supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        invitedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'declined'],
          default: 'pending',
        },
      },
    ],

    status: {
      type: String,
      enum: ['draft', 'active', 'closed', 'force_closed', 'awarded'],
      default: 'draft',
    },

    // Winner (embedded)
    winner: {
      bid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid' },
      supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      amount: Number,
      awardedAt: Date,
    },

    // Activity log (embedded)
    activityLog: [
      {
        type: {
          type: String,
          enum: ['bid_placed', 'time_extended', 'auction_started', 'auction_closed', 'rank_changed'],
        },
        message: String,
        timestamp: { type: Date, default: Date.now },
        triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],

    extensionCount: { type: Number, default: 0 },
    currentL1BidId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid' },
  },
  { timestamps: true }
);

// Validation: forcedBidCloseTime must be > bidCloseTime
rfqSchema.pre('save', function (next) {
  if (this.forcedBidCloseTime <= this.bidCloseTime) {
    return next(new Error('Forced Close Time must be greater than Bid Close Time'));
  }
  if (!this.currentCloseTime) {
    this.currentCloseTime = this.bidCloseTime;
  }
  next();
});

// Indexes
rfqSchema.index({ buyer: 1 });
rfqSchema.index({ status: 1 });
rfqSchema.index({ referenceId: 1 });
rfqSchema.index({ currentCloseTime: 1, status: 1 });

module.exports = mongoose.model('RFQ', rfqSchema);
