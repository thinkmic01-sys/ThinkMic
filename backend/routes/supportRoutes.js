const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../middleware/authMiddleware');
const { getTicket, sendMessage, getAllTickets, closeTicket } = require('../controllers/supportController');

router.use(protect);

// User routes
router.get('/', getTicket);
router.post('/', sendMessage);

// Admin routes
router.get('/all', checkRole('admin'), getAllTickets);
router.patch('/:id/close', checkRole('admin'), closeTicket);

module.exports = router;
