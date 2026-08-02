const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../middleware/authMiddleware');
const { getTicket, sendMessage, getAllTickets, closeTicket, rateTicket } = require('../controllers/supportController');

router.use(protect);

// User routes
router.get('/', getTicket);
router.post('/', sendMessage);
// Owner or admin/manager - ownership is checked inside the controller
router.patch('/:id/close', closeTicket);
router.patch('/:id/rate', rateTicket);

// Admin/manager routes
router.get('/all', checkRole('admin', 'manager'), getAllTickets);

module.exports = router;
