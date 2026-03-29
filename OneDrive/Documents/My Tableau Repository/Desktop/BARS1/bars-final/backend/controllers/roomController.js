const Room = require('../models/Room');
const User = require('../models/User');

// POST /api/rooms/create
exports.createRoom = async (req, res) => {
  try {
    const { name, isPublic, config, type, matchDetails } = req.body;
    const room = await Room.create({
      name,
      isPublic: isPublic || false,
      host: req.user._id,
      config,
      type: type || 'season',
      matchDetails,
      participants: [
        {
          user: req.user._id,
          teamName: req.body.teamName || req.user.name,
          role: 'host',
          isOnline: true,
          purseRemaining: config?.purse || 100,
        },
      ],
    });

    await User.findByIdAndUpdate(req.user._id, { $push: { joinedRooms: room._id } });
    await room.populate('participants.user', 'name email');
    req.io?.emit('room:created', { roomId: room._id, name: room.name, code: room.code });
    res.status(201).json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/rooms/join
exports.joinRoom = async (req, res) => {
  try {
    const { code, teamName } = req.body;
    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.status === 'completed') return res.status(400).json({ success: false, message: 'Room is closed' });

    const alreadyIn = room.participants.find((p) => p.user.toString() === req.user._id.toString());
    if (alreadyIn) {
      await room.populate('participants.user', 'name email');
      return res.json({ success: true, room, alreadyJoined: true });
    }

    if (room.participants.length >= room.config.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Room is full' });
    }

    room.participants.push({
      user: req.user._id,
      teamName: teamName || req.user.name,
      role: 'participant',
      isOnline: true,
      purseRemaining: room.config.purse,
    });
    await room.save();
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { joinedRooms: room._id } });
    await room.populate('participants.user', 'name email');

    req.io?.to(room._id.toString()).emit('room:participantJoined', {
      participant: room.participants[room.participants.length - 1],
    });
    req.io?.to(room._id.toString()).emit('room:participantsUpdate', {
      participants: room.participants,
    });

    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rooms/public
exports.getPublicRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isPublic: true, status: { $in: ['waiting', 'active'] } })
      .populate('host', 'name')
      .populate('participants.user', 'name')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rooms/my
exports.getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      'participants.user': req.user._id,
    })
      .populate('host', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rooms/:id
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('host', 'name email')
      .populate('participants.user', 'name email');
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/rooms/:id/config
exports.updateRoomConfig = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the host can update config' });
    }
    Object.assign(room.config, req.body.config);
    await room.save();
    req.io?.to(room._id.toString()).emit('room:configUpdated', { config: room.config });
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/rooms/:id/status
exports.updateRoomStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    room.status = status;
    await room.save();
    req.io?.to(room._id.toString()).emit('room:statusChanged', { status });
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
