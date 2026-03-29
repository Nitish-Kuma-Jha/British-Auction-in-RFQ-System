const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const RFQ = require('../models/RFQ');

module.exports = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.user?.name} (${socket.id})`);

    // Join RFQ room for live bidding
    socket.on('rfq:join', async ({ rfqId }) => {
      socket.join(rfqId);
      console.log(`${socket.user.name} joined RFQ room: ${rfqId}`);
      socket.to(rfqId).emit('rfq:userJoined', { user: socket.user.name });
    });

    // Leave RFQ room
    socket.on('rfq:leave', ({ rfqId }) => {
      socket.leave(rfqId);
    });

    // Join auction room (IPL-style)
    socket.on('room:join', async ({ roomId }) => {
      socket.join(roomId);
      // Mark user online in room
      await Room.findOneAndUpdate(
        { _id: roomId, 'participants.user': socket.user._id },
        { $set: { 'participants.$.isOnline': true } }
      );
      const room = await Room.findById(roomId).populate('participants.user', 'name');
      io.to(roomId).emit('room:participantsUpdate', { participants: room?.participants });
      socket.emit('room:joined', { room: room?.toObject() });
      console.log(`${socket.user.name} joined room: ${roomId}`);
    });

    // Leave auction room
    socket.on('room:leave', async ({ roomId }) => {
      socket.leave(roomId);
      await Room.findOneAndUpdate(
        { _id: roomId, 'participants.user': socket.user._id },
        { $set: { 'participants.$.isOnline': false } }
      );
      const room = await Room.findById(roomId).populate('participants.user', 'name');
      io.to(roomId).emit('room:participantsUpdate', { participants: room?.participants });
    });

    // Auction room: bid placed (IPL-style bidding)
    socket.on('room:bid', async ({ roomId, playerId, bidAmount, teamName }) => {
      io.to(roomId).emit('room:bidUpdate', {
        playerId,
        bidAmount,
        teamName,
        bidderName: socket.user.name,
        timestamp: new Date(),
      });
    });

    // Auction timer sync
    socket.on('room:timerSync', ({ roomId, timeLeft }) => {
      socket.to(roomId).emit('room:timerUpdate', { timeLeft });
    });

    // Host controls
    socket.on('room:hostAction', async ({ roomId, action, data }) => {
      const room = await Room.findById(roomId);
      if (!room || room.host.toString() !== socket.user._id.toString()) return;

      if (action === 'start') {
        room.status = 'active';
        await room.save();
        io.to(roomId).emit('room:started', { room: room.toObject() });
      } else if (action === 'pause') {
        room.status = 'paused';
        await room.save();
        io.to(roomId).emit('room:paused');
      } else if (action === 'nextPlayer') {
        io.to(roomId).emit('room:nextPlayer', { player: data?.player });
      } else if (action === 'sold') {
        io.to(roomId).emit('room:playerSold', data);
      } else if (action === 'unsold') {
        io.to(roomId).emit('room:playerUnsold', data);
      } else if (action === 'configUpdate') {
        Object.assign(room.config, data || {});
        await room.save();
        io.to(roomId).emit('room:configUpdated', { config: room.config });
      } else if (action === 'ended') {
        room.status = 'completed';
        await room.save();
        io.to(roomId).emit('room:ended', { soldPlayers: data?.soldPlayers || [] });
      }
    });

    // Emoji reactions
    socket.on('room:reaction', ({ roomId, emoji }) => {
      io.to(roomId).emit('room:reactionBroadcast', {
        emoji,
        from: socket.user.name,
      });
    });

    // Chat message
    socket.on('room:chat', ({ roomId, message }) => {
      io.to(roomId).emit('room:chatMessage', {
        message,
        from: socket.user.name,
        timestamp: new Date(),
      });
    });

    // RFQ: auction time extension notification
    socket.on('rfq:extensionCheck', ({ rfqId }) => {
      io.to(rfqId).emit('rfq:extensionAlert', { rfqId, message: 'Checking extension...' });
    });

    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.user?.name}`);
      // Mark user offline in all rooms they were in
      try {
        await Room.updateMany(
          { 'participants.user': socket.user._id },
          { $set: { 'participants.$[elem].isOnline': false } },
          { arrayFilters: [{ 'elem.user': socket.user._id }] }
        );
      } catch (e) {
        console.error('Socket disconnect cleanup error:', e.message);
      }
    });
  });
};
