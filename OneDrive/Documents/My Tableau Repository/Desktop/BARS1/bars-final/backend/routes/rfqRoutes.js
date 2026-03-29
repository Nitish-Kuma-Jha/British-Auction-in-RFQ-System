const express = require('express');
const router = express.Router();
const { createRFQ, listRFQs, getRFQ, updateStatus, getActivityLog } = require('../controllers/rfqController');
const { protect, authorize } = require('../middleware/auth');

router.post('/create', protect, authorize('buyer', 'admin'), createRFQ);
router.get('/list', protect, listRFQs);
router.get('/:id', protect, getRFQ);
router.put('/:id/status', protect, updateStatus);
router.get('/:id/activity', protect, getActivityLog);

module.exports = router;
