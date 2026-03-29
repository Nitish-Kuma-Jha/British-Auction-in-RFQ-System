const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      unique: true,
      default: () =>
        Math.random().toString(36).substring(2, 8).toUpperCase(),
    },
    isPublic: { type: Boolean, default: false },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Embedded participants with their details
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        teamName: { type: String },
        role: { type: String, enum: ['host', 'participant'], default: 'participant' },
        joinedAt: { type: Date, default: Date.now },
        isOnline: { type: Boolean, default: false },
        purseRemaining: { type: Number, default: 100 },
      },
    ],
    // Auction configuration
    config: {
      purse: { type: Number, default: 100 }, // in Crores
      squadSize: { type: Number, default: 15 },
      timer: { type: Number, default: 15 }, // seconds per bid
      order: { type: String, enum: ['random', 'byCategory'], default: 'random' },
      maxParticipants: { type: Number, default: 20 },
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'paused', 'completed'],
      default: 'waiting',
    },
    type: { type: String, enum: ['season', 'daily'], default: 'season' },
    // For daily auctions
    matchDetails: {
      team1: String,
      team2: String,
      matchDate: Date,
      venue: String,
    },
    currentRound: { type: Number, default: 1 },
    totalPlayers: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for quick lookup
roomSchema.index({ code: 1 });
roomSchema.index({ host: 1 });
roomSchema.index({ isPublic: 1, status: 1 });

module.exports = mongoose.model('Room', roomSchema);
