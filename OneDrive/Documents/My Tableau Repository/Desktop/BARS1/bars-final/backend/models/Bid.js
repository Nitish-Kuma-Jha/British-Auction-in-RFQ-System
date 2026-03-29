const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    rfq: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ', required: true, index: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    quote: {
      // For auction-style bids the bid amount is the primary field
      bidAmount: { type: Number, required: true, min: 0 },

      // Optional supplementary fields
      supplierNote: { type: String, trim: true, maxlength: 500 },
      transitTime: { type: String },      // kept for logistics RFQs
      quoteValidity: { type: Date },
      remarks: { type: String, trim: true },

      // totalAmount mirrors bidAmount for backward-compat with ranking logic
      totalAmount: { type: Number },
    },

    rankAtTime: { type: Number },
    changedL1:  { type: Boolean, default: false },
    changedRank:{ type: Boolean, default: false },

    isValid:      { type: Boolean, default: true },
    isWithdrawn:  { type: Boolean, default: false },

    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Mirror bidAmount → totalAmount for ranking queries
bidSchema.pre('save', function (next) {
  if (this.quote && this.quote.bidAmount != null) {
    this.quote.totalAmount = this.quote.bidAmount;
  }
  next();
});

bidSchema.index({ rfq: 1, 'quote.totalAmount': 1 });
bidSchema.index({ rfq: 1, supplier: 1 });
bidSchema.index({ rfq: 1, placedAt: -1 });

module.exports = mongoose.model('Bid', bidSchema);
