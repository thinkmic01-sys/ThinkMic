const express = require('express');
const router = express.Router();
const { getMe, updateMe, getDocumentUploadUrl } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');

// The 'protect' middleware ensures only users with a valid token can hit these
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.get('/me/documents/upload-url', protect, expensiveOperationLimiter, getDocumentUploadUrl);

module.exports = router;