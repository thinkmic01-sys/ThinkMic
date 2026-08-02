const express = require('express');
const router = express.Router();
const { getMe, updateMe } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// The 'protect' middleware ensures only users with a valid token can hit these
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);

module.exports = router;