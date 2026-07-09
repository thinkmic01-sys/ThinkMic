const express = require('express');
const router = express.Router();
const { getMe } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// The 'protect' middleware ensures only users with a valid token can hit 'getMe'
router.get('/me', protect, getMe);

module.exports = router;