const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.patch('/change-password', protect, changePassword);

module.exports = router;