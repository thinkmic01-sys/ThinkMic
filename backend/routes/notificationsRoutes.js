const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead } = require('../controllers/notificationsController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getNotifications);

router.route('/read')
    .put(protect, markAsRead);

module.exports = router;
