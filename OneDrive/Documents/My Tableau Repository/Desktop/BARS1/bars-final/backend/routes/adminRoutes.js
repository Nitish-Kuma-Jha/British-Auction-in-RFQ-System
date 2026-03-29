const express = require('express');
const router = express.Router();
const { getStats, getUsers, updateUser, getAllRFQs, deleteRoom } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.get('/stats', protect, authorize('admin'), getStats);
router.get('/users', protect, authorize('admin'), getUsers);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.get('/rfqs', protect, authorize('admin'), getAllRFQs);
router.delete('/rooms/:id', protect, authorize('admin'), deleteRoom);

module.exports = router;
