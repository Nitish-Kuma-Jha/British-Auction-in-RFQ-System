const express = require('express');
const router = express.Router();
const { createRoom, joinRoom, getPublicRooms, getMyRooms, getRoom, updateRoomConfig, updateRoomStatus } = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');

router.post('/create', protect, createRoom);
router.post('/join', protect, joinRoom);
router.get('/public', protect, getPublicRooms);
router.get('/my', protect, getMyRooms);
router.get('/:id', protect, getRoom);
router.put('/:id/config', protect, updateRoomConfig);
router.put('/:id/status', protect, updateRoomStatus);

module.exports = router;
