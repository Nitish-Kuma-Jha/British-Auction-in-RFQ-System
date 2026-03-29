const express = require('express');
const router = express.Router();
const { placeBid, getBidsByRFQ, getMyBids } = require('../controllers/bidController');
const { protect, authorize } = require('../middleware/auth');

router.post('/place', protect, authorize('supplier', 'admin'), placeBid);
router.get('/:rfqId', protect, getBidsByRFQ);
router.get('/my/:rfqId', protect, getMyBids);

module.exports = router;
